import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
}); 

redis.on("connect", () => {
  console.log("🟢 Redis Connected Successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

export default redis;