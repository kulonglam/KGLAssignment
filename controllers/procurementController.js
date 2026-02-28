const Procurement = require("../models/procurement");
const Inventory = require("../models/inventory");
const validateRequest = require("../utils/validateRequest");
const { ensureBranchAccess } = require("../utils/branchAccess");
const { validateProcurementSource } = require("../utils/procurementSourceRule");

const managerBranchGuard = (req, res, targetBranch) => {
  return ensureBranchAccess(req, res, {
    targetBranch,
    missingMessage: "Manager branch assignment is required",
    mismatchMessage: "Manager can only manage procurement for assigned branch"
  });
};

const validateSourceRules = ({ sourceType, sourceName, tonnage }, res) => {
  const sourceValidation = validateProcurementSource({
    sourceType,
    sourceName,
    tonnage
  });
  if (!sourceValidation.valid) {
    res.status(400).json({ message: sourceValidation.message });
    return false;
  }

  return true;
};

const applyInventoryForProcurementMutation = async ({
  oldData,
  newData
}) => {
  const oldKey = {
    produceName: oldData.produceName,
    produceType: oldData.produceType,
    branch: oldData.branch
  };
  const newKey = {
    produceName: newData.produceName,
    produceType: newData.produceType,
    branch: newData.branch
  };
  const oldTonnage = Number(oldData.tonnage);
  const newTonnage = Number(newData.tonnage);

  const isSameKey =
    oldKey.produceName === newKey.produceName &&
    oldKey.produceType === newKey.produceType &&
    oldKey.branch === newKey.branch;

  if (isSameKey) {
    const delta = newTonnage - oldTonnage;
    if (delta >= 0) {
      const updated = await Inventory.findOneAndUpdate(
        oldKey,
        { $inc: { stockKg: delta }, $set: { sellingPrice: Number(newData.sellingPrice) } },
        { new: true }
      );
      if (!updated) {
        throw new Error("Inventory not found for procurement update");
      }
      return async () => {
        await Inventory.findOneAndUpdate(
          oldKey,
          { $inc: { stockKg: -delta }, $set: { sellingPrice: Number(oldData.sellingPrice) } }
        );
      };
    }

    const required = Math.abs(delta);
    const updated = await Inventory.findOneAndUpdate(
      { ...oldKey, stockKg: { $gte: required } },
      { $inc: { stockKg: -required }, $set: { sellingPrice: Number(newData.sellingPrice) } },
      { new: true }
    );
    if (!updated) {
      throw new Error("Not enough stock to reduce procurement quantity");
    }
    return async () => {
      await Inventory.findOneAndUpdate(
        oldKey,
        { $inc: { stockKg: required }, $set: { sellingPrice: Number(oldData.sellingPrice) } }
      );
    };
  }

  const oldUpdated = await Inventory.findOneAndUpdate(
    { ...oldKey, stockKg: { $gte: oldTonnage } },
    { $inc: { stockKg: -oldTonnage } },
    { new: true }
  );
  if (!oldUpdated) {
    throw new Error("Cannot move procurement: insufficient stock on old inventory key");
  }

  try {
    await Inventory.findOneAndUpdate(
      newKey,
      {
        $inc: { stockKg: newTonnage },
        $set: { sellingPrice: Number(newData.sellingPrice) }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: oldTonnage } });
    throw error;
  }

  return async () => {
    await Inventory.findOneAndUpdate(newKey, { $inc: { stockKg: -newTonnage } });
    await Inventory.findOneAndUpdate(oldKey, {
      $inc: { stockKg: oldTonnage },
      $set: { sellingPrice: Number(oldData.sellingPrice) }
    });
  };
};

const listProcurements = async (req, res) => {
  const query = {};
  if (req.user.role === "Manager") {
    query.branch = req.user.branch;
  } else if (req.query.branch) {
    query.branch = req.query.branch;
  }

  const procurements = await Procurement.find(query).sort({ date: -1, time: -1 });
  return res.status(200).json(procurements);
};

const getProcurementById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const procurement = await Procurement.findById(req.params.id);
  if (!procurement) {
    return res.status(404).json({ message: "Procurement not found" });
  }

  if (req.user.role === "Manager" && procurement.branch !== req.user.branch) {
    return res.status(403).json({ message: "Access denied for this branch procurement record" });
  }

  return res.status(200).json(procurement);
};

const createProcurement = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!managerBranchGuard(req, res, req.body.branch)) {
    return;
  }

  try {
    const sourceName = req.body.sourceName || req.body.dealerName;
    if (
      !validateSourceRules(
        { sourceType: req.body.sourceType, sourceName, tonnage: req.body.tonnage },
        res
      )
    ) {
      return;
    }

    const procurement = await Procurement.create({
      produceName: req.body.produceName,
      produceType: req.body.produceType,
      date: req.body.date,
      time: req.body.time,
      tonnage: req.body.tonnage,
      cost: req.body.cost,
      sourceType: req.body.sourceType,
      sourceName,
      branch: req.body.branch,
      contact: req.body.contact,
      sellingPrice: req.body.sellingPrice
    });

    const inventory = await Inventory.findOneAndUpdate(
      {
        produceName: req.body.produceName,
        produceType: req.body.produceType,
        branch: req.body.branch
      },
      {
        $inc: { stockKg: Number(req.body.tonnage) },
        $set: { sellingPrice: Number(req.body.sellingPrice) }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(201).json({ procurement, inventory });
  } catch {
    return res.status(500).json({ message: "Failed to record procurement" });
  }
};

const updateProcurementById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const procurement = await Procurement.findById(req.params.id);
  if (!procurement) {
    return res.status(404).json({ message: "Procurement not found" });
  }

  if (!managerBranchGuard(req, res, procurement.branch)) {
    return;
  }

  const nextData = {
    produceName: req.body.produceName || procurement.produceName,
    produceType: req.body.produceType || procurement.produceType,
    date: req.body.date || procurement.date,
    time: req.body.time || procurement.time,
    tonnage: typeof req.body.tonnage === "undefined" ? procurement.tonnage : req.body.tonnage,
    cost: typeof req.body.cost === "undefined" ? procurement.cost : req.body.cost,
    sourceType: req.body.sourceType || procurement.sourceType,
    sourceName: req.body.sourceName || req.body.dealerName || procurement.sourceName,
    branch: req.body.branch || procurement.branch,
    contact: req.body.contact || procurement.contact,
    sellingPrice:
      typeof req.body.sellingPrice === "undefined"
        ? procurement.sellingPrice
        : req.body.sellingPrice
  };

  if (!managerBranchGuard(req, res, nextData.branch)) {
    return;
  }

  if (!validateSourceRules(nextData, res)) {
    return;
  }

  let rollback = async () => {};
  try {
    rollback = await applyInventoryForProcurementMutation({
      oldData: procurement,
      newData: nextData
    });

    procurement.produceName = nextData.produceName;
    procurement.produceType = nextData.produceType;
    procurement.date = nextData.date;
    procurement.time = nextData.time;
    procurement.tonnage = nextData.tonnage;
    procurement.cost = nextData.cost;
    procurement.sourceType = nextData.sourceType;
    procurement.sourceName = nextData.sourceName;
    procurement.branch = nextData.branch;
    procurement.contact = nextData.contact;
    procurement.sellingPrice = nextData.sellingPrice;
    await procurement.save();

    return res.status(200).json(procurement);
  } catch (error) {
    await rollback();
    return res.status(400).json({ message: error.message || "Failed to update procurement" });
  }
};

const deleteProcurementById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const procurement = await Procurement.findById(req.params.id);
  if (!procurement) {
    return res.status(404).json({ message: "Procurement not found" });
  }

  if (!managerBranchGuard(req, res, procurement.branch)) {
    return;
  }

  const key = {
    produceName: procurement.produceName,
    produceType: procurement.produceType,
    branch: procurement.branch
  };
  const tonnage = Number(procurement.tonnage);

  const inventory = await Inventory.findOneAndUpdate(
    { ...key, stockKg: { $gte: tonnage } },
    { $inc: { stockKg: -tonnage } },
    { new: true }
  );

  if (!inventory) {
    return res.status(400).json({ message: "Cannot delete procurement due to insufficient stock" });
  }

  try {
    await Procurement.deleteOne({ _id: procurement._id });
    return res.status(200).json({ message: "Procurement deleted" });
  } catch {
    await Inventory.findOneAndUpdate(key, { $inc: { stockKg: tonnage } });
    return res.status(500).json({ message: "Failed to delete procurement" });
  }
};

module.exports = {
  listProcurements,
  getProcurementById,
  createProcurement,
  updateProcurementById,
  deleteProcurementById
};
