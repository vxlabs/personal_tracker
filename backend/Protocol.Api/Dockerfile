FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Protocol.Api.csproj", "."]
RUN dotnet restore "Protocol.Api.csproj"
COPY . .
RUN dotnet build "Protocol.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Protocol.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Protocol.Api.dll"]
