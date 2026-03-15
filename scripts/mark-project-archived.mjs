import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const readmePath = path.join(rootDir, "README.md");
const targetDate = "2026-03-21";

const kstDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

if (kstDate < targetDate) {
  console.log(`Skip: current KST date ${kstDate} is earlier than ${targetDate}.`);
  process.exit(0);
}

const readme = fs.readFileSync(readmePath, "utf8");
const liveBlock = `<!-- post-event-note:start -->
> [!IMPORTANT]
> Live event note: the event is still running until \`2026-03-20\` in Korea time.  
> This public repository intentionally excludes live QR artifacts such as \`generated/qr\` and \`attendance_days.seed.sql\` to avoid leaking operational tokens during the event.
<!-- post-event-note:end -->`;

const archiveBlock = `<!-- post-event-note:start -->
> [!NOTE]
> Archive note: the event has finished, and this repository is now kept as a portfolio archive.  
> Live QR artifacts remain excluded on purpose because they are operational outputs, not source code required to understand the system.
<!-- post-event-note:end -->`;

if (readme.includes(archiveBlock)) {
  console.log("Skip: README is already marked as archived.");
  process.exit(0);
}

if (!readme.includes(liveBlock)) {
  console.error("Expected live-event block was not found in README.md.");
  process.exit(1);
}

fs.writeFileSync(readmePath, readme.replace(liveBlock, archiveBlock));
console.log("README updated to archive note.");
