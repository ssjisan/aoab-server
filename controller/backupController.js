const mongoose = require("mongoose");
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

const backupMongoDB = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, "../../backups");
    await fs.emptyDir(backupDir); // Clean old backups

    const collections = await mongoose.connection.db.listCollections().toArray();

    for (const coll of collections) {
      const name = coll.name;
      const data = await mongoose.connection.db.collection(name).find().toArray();
      await fs.writeJson(path.join(backupDir, `${name}.json`), data, { spaces: 2 });
    }

    // Create ZIP
    const zipPath = path.join(backupDir, "mongodb-backup.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(backupDir, false);
    archive.finalize();

    output.on("close", () => {
      res.download(zipPath, "mongodb-backup.zip", async (err) => {
        if (err) console.error("Download error:", err);
        await fs.remove(backupDir); // Clean up after download
      });
    });

    archive.on("error", (err) => {
      console.error("Archiving error:", err);
      res.status(500).json({ error: "Backup failed during zip." });
    });
  } catch (err) {
    console.error("Backup error:", err);
    res.status(500).json({ error: "Backup failed." });
  }
};

module.exports = { backupMongoDB };
