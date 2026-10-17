# Local debugging and JVM crash troubleshooting

## Enable detailed local logging

Run the backend with the `local` Spring profile. From `backend/` on Windows PowerShell:

```powershell
$env:SPRING_PROFILES_ACTIVE = "local"
$env:LOG_PATH = "logs"
./mvnw spring-boot:run
```

If the repository has no Maven wrapper, use `mvn spring-boot:run` instead. In IntelliJ, add `local` to **Run Configuration → Active profiles**. Logs go to the console and `backend/logs/apartment-saas.log`; rolling archives are under `backend/logs/archive/`.

The local profile logs Hibernate SQL and JDBC bind values. Bind values may contain tenant names, email addresses, tokens, or financial data. Keep these logs local, do not commit them, and disable the `local` profile before sharing logs or running in production. `spring.jpa.show-sql` stays off to avoid duplicate, unstructured SQL output.

To return to normal logging, remove the `local` active profile. Do not enable `org.hibernate.orm.jdbc.bind=TRACE` in production.

## Capture evidence for exit code `-1073741819 (0xC0000005)`

`0xC0000005` is a Windows native access-violation status. It is not a normal Java exception code. Application logging may stop abruptly if the JVM or a native component crashes, so the most useful evidence is the JVM fatal-error report and the exact runtime environment.

1. Confirm the exact JDK used by the IDE and shell: `java -version` and `where.exe java`.
2. Temporarily add these VM options to the IntelliJ run configuration:

   ```text
   -XX:ErrorFile=logs/hs_err_pid%p.log
   -XX:+HeapDumpOnOutOfMemoryError
   -XX:HeapDumpPath=logs
   ```

   Create the `logs` directory first. `hs_err_pid*.log` is the key artifact for an access violation; a heap dump is mainly for Java heap exhaustion and may not be produced for this error.
3. Reproduce once and inspect the `Problematic frame`, `Current thread`, `Native frames`, `JRE version`, loaded native libraries, and any `hs_err_pid*.log` file. Also check Windows Event Viewer → Windows Logs → Application for the faulting module.
4. Run outside the IDE to separate IDE/debugger issues from application issues: `mvn spring-boot:run` or the packaged JAR using the same JDK and profile.
5. As an isolation test only, temporarily disable virtual threads (`spring.threads.virtual.enabled=false`) and rerun. If the crash stops, compare the JDK build and thread stack in the fatal-error report; this is a diagnostic experiment, not a proven fix.
6. Update to a current, supported 64-bit JDK 21 patch release and update IntelliJ. If the issue persists, test a clean JDK install and temporarily disable third-party Java agents/profilers/monitoring agents. Do not assume the database or Hibernate caused the native crash without evidence.

Please share the complete `hs_err_pid*.log` (redact local usernames/paths if desired), the final 100–200 console lines, JDK vendor/version, IntelliJ version, and whether the crash happens on startup or after a particular request. Do not share secrets or production tenant data.
