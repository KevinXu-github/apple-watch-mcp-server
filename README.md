# Apple Watch MCP Server

A Model Context Protocol (MCP) server implementation for accessing Apple Watch health data. This project serves as a learning exercise for understanding and implementing MCP servers while providing practical health data integration capabilities.

## Purpose

This project is designed as an **MCP learning project** to:

- Understand the Model Context Protocol (MCP) specification and implementation
- Learn how to build custom MCP servers that can integrate with AI assistants
- Explore health data parsing and processing from Apple Health exports
- Practice TypeScript development with proper tooling and structure
- Demonstrate real-world MCP server capabilities with meaningful data

## What It Does

The Apple Watch MCP Server provides AI assistants with access to Apple Watch health data through three main tools:

### Available Tools

1. **`get_health_summary`** - Retrieve comprehensive health metrics
   - Steps, heart rate (resting/average/max), sleep hours, active calories, workout count
   - Supports timeframes: today, week, month

2. **`get_workout_details`** - Get detailed workout information
   - Recent workout history with duration, distance, heart rate, calories
   - Configurable limit for number of workouts returned

3. **`get_heart_rate_zones`** - Analyze heart rate zone distribution
   - Time spent in different heart rate zones
   - Recovery, aerobic, anaerobic zone breakdowns

## Data Sources

The server intelligently handles multiple data sources in order of preference:

1. **iPhone Data** (via iCloud sync) - Real-time data from `health-data.json`
2. **Apple Health Export** - Official XML export from Apple Health app
3. **Realistic Mock Data** - Fallback with consistent, believable health metrics

## Technical Architecture

### Project Structure

```
apple-watch-mcp/
├── src/
│   ├── index.ts           # Main MCP server implementation
│   ├── appleHealth.ts     # Health data reader and processor
│   └── xmlParser.ts       # Apple Health XML export parser
├── package.json           # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Key Technologies

- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)** - Official MCP TypeScript SDK
- **TypeScript** - Type-safe development
- **xml2js** - Apple Health XML parsing
- **plist** - Apple property list handling

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript knowledge (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apple-watch-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run the server**
   ```bash
   npm start
   ```

### Development Mode

For active development with auto-reload:

```bash
npm run dev
```

## Data Setup (Optional)

### Apple Health Export

1. Open Apple Health app on iPhone
2. Tap your profile picture
3. Scroll down and tap "Export All Health Data"
4. Save the export to your Documents folder as `apple_health_export`

### iPhone Real-time Data

Create a `health-data.json` file in your iCloud Drive with:

```json
{
  "steps": 8420,
  "heartRate": 75,
  "sleepHours": 7.5,
  "activeCalories": 450,
  "timestamp": "2025-07-18T10:30:00Z"
}
```

## MCP Integration

### Claude Desktop Configuration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "apple-watch": {
      "command": "node",
      "args": ["/path/to/apple-watch-mcp/dist/index.js"]
    }
  }
}
```

### Usage Examples

Once integrated, you can ask Claude:

- "What's my health summary for today?"
- "Show me my workout details from this week"
- "Analyze my heart rate zones for yesterday"
- "How many steps did I take this month?"

## Learning Outcomes

This project demonstrates:

### MCP Concepts
- **Server Implementation** - How to create a functional MCP server
- **Tool Definition** - Proper schema definition for AI tool integration
- **Request Handling** - Processing and responding to MCP tool calls
- **Error Handling** - Graceful degradation and error responses

### Real-world Integration
- **Data Source Flexibility** - Multiple fallback data sources
- **Health Data Processing** - Parsing complex XML health exports
- **Time-series Analysis** - Filtering and aggregating health metrics
- **Mock Data Strategy** - Realistic fallbacks for development/demo

### TypeScript Best Practices
- **Type Safety** - Comprehensive interfaces and type definitions
- **Modular Architecture** - Separation of concerns across files
- **Configuration Management** - Flexible path and data source handling



