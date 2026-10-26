import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "client",
    required: true
  },
  description: String,
  techStack: [String],
  status: {
    type: String,
    enum: ["New", "In Progress", "Completed", "On Hold", "Handed Over", "Revoked"],
    default: "New"
  },
  assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "employee" }],
  startDate: Date,
  endDate: Date,
  totalAmount: {
    type: Number,
    default: 0
  },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }]
})

export default mongoose.model("project", projectSchema);
