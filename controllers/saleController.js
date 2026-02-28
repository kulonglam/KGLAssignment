const { validationResult } = require("express-validator");
const Sale = require("../models/sales");
const Inventory = require("../models/inventory");
const Notification = require("../models/notification");

const nearlyEqual = (a, b) => Math.abs(Number(a) - Number(b)) < 0.01;
const DIRECTOR_USERNAME = (process.env.DIRECTOR_USERNAME || "MrOrban").toLowerCase();

const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }

  return true;
};

const fetchInventoryForSale = async ({ produceName, produceType, branch }) => {
  if (produceType) {
    return Inventory.findOne({ produceName, produceType, branch });
  }

  const matches = await Inventory.find({ produceName, branch });
  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    const error = new Error("Multiple produce types found. Provide produceType");
    error.statusCode = 400;
    throw error;
  }

  return null;
};

const createManagerNotification = async (payload) => {
  await Notification.create({ targetRole: "Manager", ...payload });
};

const ensureBranchAccess = (req, res, branch) => {
  if (!req.user.branch) {
    res.status(403).json({ message: "User branch assignment is required" });
    return false;
  }

  if (req.user.branch !== branch) {
    res.status(403).json({ message: "You can only manage sales for your assigned branch" });
    return false;
  }

  return true;
};

const applySaleInventoryMutation = async ({ oldData, newData }) => {
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
  const sameKey =
    oldKey.produceName === newKey.produceName &&
    oldKey.produceType === newKey.produceType &&
    oldKey.branch === newKey.branch;

  if (sameKey) {
    const delta = oldTonnage - newTonnage;
    if (delta >= 0) {
      await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: delta } });
      return async () => {
        await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: -delta } });
      };
    }

    const required = Math.abs(delta);
    const reduced = await Inventory.findOneAndUpdate(
      { ...oldKey, stockKg: { $gte: required } },
      { $inc: { stockKg: -required } }
    );
    if (!reduced) {
      throw new Error("Insufficient stock to increase sale tonnage");
    }
    return async () => {
      await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: required } });
    };
  }

  await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: oldTonnage } });
  const reduced = await Inventory.findOneAndUpdate(
    { ...newKey, stockKg: { $gte: newTonnage } },
    { $inc: { stockKg: -newTonnage } }
  );

  if (!reduced) {
    await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: -oldTonnage } });
    throw new Error("Insufficient stock on new inventory key");
  }

  return async () => {
    await Inventory.findOneAndUpdate(newKey, { $inc: { stockKg: newTonnage } });
    await Inventory.findOneAndUpdate(oldKey, { $inc: { stockKg: -oldTonnage } });
  };
};

const createSaleFromPayload = async ({ req, res, saleType }) => {
  if (!validateRequest(req, res)) {
    return;
  }

  if (!ensureBranchAccess(req, res, req.body.branch)) {
    return;
  }

  try {
    const inventory = await fetchInventoryForSale({
      produceName: req.body.produceName,
      produceType: req.body.produceType,
      branch: req.body.branch
    });

    if (!inventory) {
      await createManagerNotification({
        title: "Stock unavailable",
        message: `${req.body.produceName} is unavailable at ${req.body.branch}`,
        branch: req.body.branch,
        produceName: req.body.produceName,
        produceType: req.body.produceType
      });
      return res.status(400).json({ message: "Product is out of stock for this branch" });
    }

    const tonnage = Number(req.body.tonnage);
    const totalExpected = Number(inventory.sellingPrice) * tonnage;
    if (totalExpected < 10000) {
      return res.status(400).json({
        message: "Computed amount is below the minimum allowed value of 10000"
      });
    }

    if (saleType === "Cash" && !nearlyEqual(req.body.amountPaid, totalExpected)) {
      return res.status(400).json({
        message: "amountPaid must match manager-set selling price",
        expectedAmount: totalExpected
      });
    }

    if (saleType === "Credit" && !nearlyEqual(req.body.amountDue, totalExpected)) {
      return res.status(400).json({
        message: "amountDue must match manager-set selling price",
        expectedAmount: totalExpected
      });
    }

    const reducedInventory = await Inventory.findOneAndUpdate(
      { _id: inventory._id, stockKg: { $gte: tonnage } },
      { $inc: { stockKg: -tonnage } },
      { new: true }
    );

    if (!reducedInventory) {
      await createManagerNotification({
        title: "Low stock block",
        message: `${req.body.produceName} has insufficient stock at ${req.body.branch}`,
        branch: req.body.branch,
        produceName: req.body.produceName,
        produceType: inventory.produceType
      });
      return res.status(400).json({ message: "Insufficient stock for requested tonnage" });
    }

    let sale;
    try {
      sale = await Sale.create({
        saleType,
        produceName: req.body.produceName,
        produceType: inventory.produceType,
        branch: req.body.branch,
        tonnage,
        unitPriceUsed: inventory.sellingPrice,
        totalExpected,
        amountPaid: saleType === "Cash" ? Number(req.body.amountPaid) : undefined,
        amountDue: saleType === "Credit" ? Number(req.body.amountDue) : undefined,
        buyerName: req.body.buyerName,
        salesAgentName: req.body.salesAgentName,
        date: saleType === "Cash" ? req.body.date : undefined,
        time: saleType === "Cash" ? req.body.time : undefined,
        nationalId: saleType === "Credit" ? req.body.nationalId : undefined,
        location: saleType === "Credit" ? req.body.location : undefined,
        contact: saleType === "Credit" ? req.body.contacts || req.body.contact : undefined,
        dueDate: saleType === "Credit" ? req.body.dueDate : undefined,
        dispatchDate: saleType === "Credit" ? req.body.dispatchDate : undefined
      });
    } catch (error) {
      await Inventory.findByIdAndUpdate(inventory._id, { $inc: { stockKg: tonnage } });
      throw error;
    }

    if (reducedInventory.stockKg === 0) {
      await createManagerNotification({
        title: "Out of stock",
        message: `${req.body.produceName} is now out of stock at ${req.body.branch}`,
        branch: req.body.branch,
        produceName: req.body.produceName,
        produceType: inventory.produceType
      });
    }

    return res.status(201).json(sale);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ message: error.message || `Failed to record ${saleType.toLowerCase()} sale` });
  }
};

const createCashSale = async (req, res) => createSaleFromPayload({ req, res, saleType: "Cash" });

const createCreditSale = async (req, res) =>
  createSaleFromPayload({ req, res, saleType: "Credit" });

const listSales = async (req, res) => {
  const query = {};
  if (req.user.role === "Manager" || req.user.role === "SalesAgent") {
    query.branch = req.user.branch;
  }
  if (req.query.saleType) {
    query.saleType = req.query.saleType;
  }

  const sales = await Sale.find(query).sort({ createdAt: -1 });
  return res.status(200).json(sales);
};

const getSaleById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const sale = await Sale.findById(req.params.id);
  if (!sale) {
    return res.status(404).json({ message: "Sale not found" });
  }

  if ((req.user.role === "Manager" || req.user.role === "SalesAgent") && sale.branch !== req.user.branch) {
    return res.status(403).json({ message: "Access denied for this branch sale record" });
  }

  return res.status(200).json(sale);
};

const updateSaleById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const sale = await Sale.findById(req.params.id);
  if (!sale) {
    return res.status(404).json({ message: "Sale not found" });
  }

  if (!ensureBranchAccess(req, res, sale.branch)) {
    return;
  }

  if (typeof req.body.saleType !== "undefined" && req.body.saleType !== sale.saleType) {
    return res.status(400).json({ message: "saleType cannot be changed" });
  }

  const nextData = {
    saleType: sale.saleType,
    produceName: req.body.produceName || sale.produceName,
    produceType: req.body.produceType || sale.produceType,
    branch: req.body.branch || sale.branch,
    tonnage: typeof req.body.tonnage === "undefined" ? sale.tonnage : req.body.tonnage,
    buyerName: req.body.buyerName || sale.buyerName,
    salesAgentName: req.body.salesAgentName || sale.salesAgentName,
    date: req.body.date || sale.date,
    time: req.body.time || sale.time,
    nationalId: req.body.nationalId || sale.nationalId,
    location: req.body.location || sale.location,
    contact: req.body.contacts || req.body.contact || sale.contact,
    dueDate: req.body.dueDate || sale.dueDate,
    dispatchDate: req.body.dispatchDate || sale.dispatchDate,
    amountPaid: typeof req.body.amountPaid === "undefined" ? sale.amountPaid : req.body.amountPaid,
    amountDue: typeof req.body.amountDue === "undefined" ? sale.amountDue : req.body.amountDue
  };

  if (!ensureBranchAccess(req, res, nextData.branch)) {
    return;
  }

  const inventory = await fetchInventoryForSale({
    produceName: nextData.produceName,
    produceType: nextData.produceType,
    branch: nextData.branch
  });
  if (!inventory) {
    return res.status(400).json({ message: "Target inventory record not found for sale update" });
  }

  const totalExpected = Number(inventory.sellingPrice) * Number(nextData.tonnage);
  if (totalExpected < 10000) {
    return res.status(400).json({ message: "Computed amount is below minimum value of 10000" });
  }

  if (sale.saleType === "Cash" && !nearlyEqual(nextData.amountPaid, totalExpected)) {
    return res.status(400).json({
      message: "amountPaid must match manager-set selling price",
      expectedAmount: totalExpected
    });
  }

  if (sale.saleType === "Credit" && !nearlyEqual(nextData.amountDue, totalExpected)) {
    return res.status(400).json({
      message: "amountDue must match manager-set selling price",
      expectedAmount: totalExpected
    });
  }

  let rollback = async () => {};
  try {
    rollback = await applySaleInventoryMutation({ oldData: sale, newData: nextData });

    sale.produceName = nextData.produceName;
    sale.produceType = inventory.produceType;
    sale.branch = nextData.branch;
    sale.tonnage = Number(nextData.tonnage);
    sale.unitPriceUsed = Number(inventory.sellingPrice);
    sale.totalExpected = totalExpected;
    sale.buyerName = nextData.buyerName;
    sale.salesAgentName = nextData.salesAgentName;
    if (sale.saleType === "Cash") {
      sale.amountPaid = Number(nextData.amountPaid);
      sale.date = nextData.date;
      sale.time = nextData.time;
    } else {
      sale.amountDue = Number(nextData.amountDue);
      sale.nationalId = nextData.nationalId;
      sale.location = nextData.location;
      sale.contact = nextData.contact;
      sale.dueDate = nextData.dueDate;
      sale.dispatchDate = nextData.dispatchDate;
    }

    await sale.save();
    return res.status(200).json(sale);
  } catch (error) {
    await rollback();
    return res.status(400).json({ message: error.message || "Failed to update sale" });
  }
};

const deleteSaleById = async (req, res) => {
  if (!validateRequest(req, res)) {
    return;
  }

  const sale = await Sale.findById(req.params.id);
  if (!sale) {
    return res.status(404).json({ message: "Sale not found" });
  }

  if (!ensureBranchAccess(req, res, sale.branch)) {
    return;
  }

  const inventoryKey = {
    produceName: sale.produceName,
    produceType: sale.produceType,
    branch: sale.branch
  };
  const tonnage = Number(sale.tonnage);

  await Inventory.findOneAndUpdate(inventoryKey, { $inc: { stockKg: tonnage } }, { upsert: false });

  try {
    await Sale.deleteOne({ _id: sale._id });
    return res.status(200).json({ message: "Sale deleted" });
  } catch {
    await Inventory.findOneAndUpdate(inventoryKey, { $inc: { stockKg: -tonnage } });
    return res.status(500).json({ message: "Failed to delete sale" });
  }
};

const getSalesTotalsReport = async (req, res) => {
  try {
    if (!req.user.username || req.user.username.toLowerCase() !== DIRECTOR_USERNAME) {
      return res.status(403).json({ message: "Only MrOrban can view this report" });
    }

    const match = {};

    if (req.query.startDate || req.query.endDate) {
      if (req.query.startDate && Number.isNaN(Date.parse(req.query.startDate))) {
        return res.status(400).json({ message: "startDate must be a valid date" });
      }
      if (req.query.endDate && Number.isNaN(Date.parse(req.query.endDate))) {
        return res.status(400).json({ message: "endDate must be a valid date" });
      }

      match.createdAt = {};
      if (req.query.startDate) {
        match.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setUTCHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    const [grandTotals] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalTonnageKg: { $sum: "$tonnage" },
          totalCashCollected: { $sum: { $ifNull: ["$amountPaid", 0] } },
          totalCreditDue: { $sum: { $ifNull: ["$amountDue", 0] } },
          totalExpectedRevenue: { $sum: "$totalExpected" }
        }
      },
      { $project: { _id: 0 } }
    ]);

    const branchTotals = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$branch",
          totalTransactions: { $sum: 1 },
          totalTonnageKg: { $sum: "$tonnage" },
          totalCashCollected: { $sum: { $ifNull: ["$amountPaid", 0] } },
          totalCreditDue: { $sum: { $ifNull: ["$amountDue", 0] } },
          totalExpectedRevenue: { $sum: "$totalExpected" }
        }
      },
      {
        $project: {
          _id: 0,
          branch: "$_id",
          totalTransactions: 1,
          totalTonnageKg: 1,
          totalCashCollected: 1,
          totalCreditDue: 1,
          totalExpectedRevenue: 1
        }
      },
      { $sort: { branch: 1 } }
    ]);

    return res.status(200).json({
      period: {
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null
      },
      grandTotals: grandTotals || {
        totalTransactions: 0,
        totalTonnageKg: 0,
        totalCashCollected: 0,
        totalCreditDue: 0,
        totalExpectedRevenue: 0
      },
      branchTotals
    });
  } catch {
    return res.status(500).json({ message: "Failed to generate report totals" });
  }
};

module.exports = {
  createCashSale,
  createCreditSale,
  listSales,
  getSaleById,
  updateSaleById,
  deleteSaleById,
  getSalesTotalsReport
};
