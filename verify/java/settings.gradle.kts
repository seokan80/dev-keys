rootProject.name = "devkeys-code-verification"
val cases = file("build/generated/cases.txt")
check(cases.exists()) { "먼저 npm run validate:code를 실행하세요 (소스 생성 필요)" }
cases.readLines().filter { it.isNotBlank() }.forEach { id ->
    check(id.matches(Regex("[a-z0-9-]+"))) { "잘못된 검증 id: $id" }
    include(id)
    project(":$id").projectDir = file("build/projects/$id")
}
