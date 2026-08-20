import { loadMemberConfig, MEMBER_ATTRIBUTE_KEY, setMemberStatus } from "./attributes.js";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function usage() {
  console.error("사용법:");
  console.error("  npm run member:grant -- --user-id <Xsolla user UUID>");
  console.error("  npm run member:revoke -- --user-id <Xsolla user UUID>");
}

const action = process.argv[2];
const userId = readArgument("--user-id")?.trim();

if (!['grant', 'revoke'].includes(action) || !userId) {
  usage();
  process.exitCode = 1;
} else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
  console.error("--user-id에는 JWT sub의 Xsolla 사용자 UUID를 입력하세요.");
  process.exitCode = 1;
} else {
  try {
    const member = action === "grant";
    const attribute = await setMemberStatus({
      userId,
      member,
      config: loadMemberConfig(),
    });
    console.log(`Xsolla 사용자 속성 저장 완료: ${MEMBER_ATTRIBUTE_KEY}=${attribute.value}`);
    console.log("웹숍에서 로그아웃 후 다시 로그인해 개인화 카탈로그를 확인하세요.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
