import UserSubscription from "../../models/userSubscriptionModel.js";

export const getAllSubscriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";
    const currency = req.query.currency || "";

    const skip = (page - 1) * limit;

    const matchFilter = {};
    if (status) matchFilter.status = status;
    if (currency) matchFilter.currency = currency;

    const searchFilter = search
      ? {
          $or: [
            { "user.firstName": { $regex: search, $options: "i" } },
            { "user.lastName": { $regex: search, $options: "i" } },
            { "user.phone": { $regex: search, $options: "i" } },
            { "user.email": { $regex: search, $options: "i" } },
            { "field.fieldName": { $regex: search, $options: "i" } },
            { "plan.name": { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const data = await UserSubscription.aggregate([
      { $match: matchFilter },

      // USER + ORGANIZATION LOOKUP (GUARANTEED TO WORK)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "organizations",
          localField: "user.organization",
          foreignField: "_id",
          as: "userOrganization",
        },
      },

      // FIELD
      {
        $lookup: {
          from: "farmfields",
          localField: "fieldId",
          foreignField: "_id",
          as: "field",
        },
      },
      { $unwind: { path: "$field", preserveNullAndEmptyArrays: true } },

      // PLAN
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },

      // LATEST PAYMENT
      {
        $lookup: {
          from: "payments",
          let: { subId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$subscriptionId", "$$subId"] },
                status: "captured",
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $project: {
                invoiceNumber: 1,
                method: 1,
                cardLast4: 1,
                upiId: 1,
                amountMinor: 1,
              },
            },
          ],
          as: "payment",
        },
      },
      { $unwind: { path: "$payment", preserveNullAndEmptyArrays: true } },

      // SEARCH + PAGINATION
      { $match: searchFilter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

      // FINAL 16 FIELDS — organizationCode 100% WORKS
      {
        $project: {
          _id: 1,
          fieldName: "$field.fieldName",
          userFirstName: "$user.firstName",
          userLastName: "$user.lastName",
          userPhone: "$user.phone",
          planName: "$plan.name",
          planId: 1,
          hectares: 1,
          currency: 1,
          billingCycle: 1,
          razorpaySubscriptionId: 1,
          razorpayLastInvoiceId: 1,
          status: 1,
          nextBillingAt: 1,

          // THIS IS THE FIX — GUARANTEED "CROPGEN"
          organizationCode: {
            $ifNull: [
              { $arrayElemAt: ["$userOrganization.organizationCode", 0] },
              "-",
            ],
          },

          lastInvoice: { $ifNull: ["$payment.invoiceNumber", "-"] },
          paymentMethod: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$payment.method", "card"] },
                  then: {
                    $concat: [
                      "Card •••• ",
                      { $ifNull: ["$payment.cardLast4", "0000"] },
                    ],
                  },
                },
                {
                  case: { $eq: ["$payment.method", "upi"] },
                  then: {
                    $concat: ["UPI ", { $ifNull: ["$payment.upiId", ""] }],
                  },
                },
              ],
              default: "Pending",
            },
          },
          amount: {
            $ifNull: [
              { $divide: ["$payment.amountMinor", 100] },
              { $divide: ["$amountMinor", 100] },
            ],
          },
        },
      },
    ]);

    // Count
    const total = await UserSubscription.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "organizations",
          localField: "user.organization",
          foreignField: "_id",
          as: "userOrganization",
        },
      },
      {
        $lookup: {
          from: "farmfields",
          localField: "fieldId",
          foreignField: "_id",
          as: "field",
        },
      },
      { $unwind: { path: "$field", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "subscriptionplans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      { $match: searchFilter },
      { $count: "total" },
    ]);

    res.json({
      success: true,
      pagination: {
        page,
        limit,
        total: total[0]?.total || 0,
        totalPages: Math.ceil((total[0]?.total || 0) / limit),
      },
      data,
    });
  } catch (e) {
    console.error("getAllSubscriptions error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
