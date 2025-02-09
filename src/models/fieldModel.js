import mongoose from "mongoose";

const farmFieldSchema = new mongoose.Schema(
  {
    field: {
      type: [
        {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
        },
      ],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    fieldName: {
      type: String,
      required: true,
    },
    cropName: {
      type: String,
      required: true,
    },
    variety: {
      type: String,
      required: true,
    },
    sowingDate: {
      type: String,
      required: true,
    },
    acre: {
      type: Number,
      required: true,
    },
    typeOfIrrigation: {
      type: String,
      required: true,
    },
    typeOfFarming: {
      type: String,
      enum: ["Organic", "Inorganic", "Integrated"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const FarmField = mongoose.model("FarmField", farmFieldSchema);

export default FarmField;
