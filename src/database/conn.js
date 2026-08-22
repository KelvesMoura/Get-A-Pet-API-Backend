const mongoose = require("mongoose");

const uri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_USER_PASS}@${process.env.MONGO_HOST}:27017/getapet?authSource=admin&tls=false`;

async function main() {
  await mongoose.connect(uri);
  console.log("Mongodb connected with Mongoose");
}

main().catch((err) => console.log(err));

module.exports = mongoose;
