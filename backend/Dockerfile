# Build context: repository root
#   docker build -f backend/Dockerfile .
# On Render: Dockerfile Path = backend/Dockerfile, Docker Context = .

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY backend/gradle backend/gradle
COPY backend/gradlew backend/build.gradle.kts backend/settings.gradle.kts backend/
COPY backend/src backend/src
WORKDIR /workspace/backend
RUN chmod +x gradlew && ./gradlew bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/backend/build/libs/*.jar /app/app.jar
EXPOSE 8080
CMD ["sh", "-c", "java -Xmx512m -Xms256m -Dserver.port=${PORT:-8080} -Dserver.address=0.0.0.0 -jar /app/app.jar"]
