# Build context must be the backend/ directory.
#   docker build -f backend/Dockerfile backend
# On Render:
#   Dockerfile Path = backend/Dockerfile
#   Docker Build Context Directory = backend
#   Manual Deploy → Clear build cache & deploy

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY gradle/wrapper/gradle-wrapper.jar gradle/wrapper/gradle-wrapper.jar
COPY gradle/wrapper/gradle-wrapper.properties gradle/wrapper/gradle-wrapper.properties
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY src src
RUN test -s gradle/wrapper/gradle-wrapper.jar \
    && chmod +x gradlew \
    && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar /app/app.jar
EXPOSE 8080
CMD ["sh", "-c", "java -Xmx512m -Xms256m -Dserver.port=${PORT:-8080} -Dserver.address=0.0.0.0 -jar /app/app.jar"]
