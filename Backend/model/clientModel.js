import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
    clientName:{
        type:String,
        required: true
    },
    contactNumber: {
        type:String,
        required:true,
        unique:true
    },
    email:{
       type:String,
       required:false,
       lowercase:true,
       trim: true,
       default: ""
    },
    address:{
        type:String,
        default: "",
        required:false
    },
    clientId: {
        type: String,
        unique: true,
        sparse: true
    },
    referenceNo:{
        type:String,
        default: "",
        required: true,
        unique: true   
    }
},
    {timestamps: true}
)

export default mongoose.model("client", clientSchema)