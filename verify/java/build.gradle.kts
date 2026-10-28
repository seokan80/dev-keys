plugins { base }

subprojects {
    apply(plugin = "java")
    repositories { mavenCentral() }
    extensions.configure<JavaPluginExtension> {
        toolchain.languageVersion.set(JavaLanguageVersion.of(21))
        sourceSets.getByName("main").java.setSrcDirs(listOf(rootProject.file("build/generated/$name")))
    }
    if (name.startsWith("spring-")) dependencies {
        add("implementation", platform("org.springframework.boot:spring-boot-dependencies:4.1.2"))
        add("implementation", "org.springframework.boot:spring-boot-starter-webmvc")
        add("implementation", "org.springframework.boot:spring-boot-starter-validation")
        add("implementation", "org.springframework:spring-test")
    }
    tasks.withType<JavaCompile>().configureEach {
        options.release.set(21)
        options.encoding = "UTF-8"
        options.compilerArgs.add("-parameters")
    }
    val verifySnippet = tasks.register<JavaExec>("verifySnippet") {
        dependsOn(tasks.named("classes"))
        classpath = project.extensions.getByType<JavaPluginExtension>().sourceSets.getByName("main").runtimeClasspath
        mainClass.set("RunVerification")
        javaLauncher.set(project.extensions.getByType<JavaToolchainService>().launcherFor { languageVersion.set(JavaLanguageVersion.of(21)) })
        timeout.set(java.time.Duration.ofSeconds(30))
    }
    tasks.named("check") { dependsOn(verifySnippet) }
    rootProject.tasks.named("check") { dependsOn(verifySnippet) }
}
