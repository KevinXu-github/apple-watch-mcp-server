import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { AppleHealthReader } from './appleHealth.js';

class AppleWatchMCPServer {
  private server: Server;
  private healthReader: AppleHealthReader;

  constructor() {
    this.server = new Server(
      {
        name: 'apple-watch-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.healthReader = new AppleHealthReader();
    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_health_summary',
            description: 'Get a summary of Apple Watch health data',
            inputSchema: {
              type: 'object',
              properties: {
                timeframe: {
                  type: 'string',
                  description: 'Time period for the summary (today, week, month)',
                  enum: ['today', 'week', 'month'],
                },
              },
              required: ['timeframe'],
            },
          },
          {
            name: 'get_workout_details',
            description: 'Get detailed information about recent workouts',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of recent workouts to retrieve',
                  default: 5,
                },
              },
            },
          },
          {
            name: 'get_heart_rate_zones',
            description: 'Get heart rate zone analysis for a specific date',
            inputSchema: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'Date in YYYY-MM-DD format (default: today)',
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls with comprehensive error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      console.error(`=== TOOL CALL RECEIVED ===`);
      console.error(`Tool: ${request.params.name}`);
      console.error(`Arguments: ${JSON.stringify(request.params.arguments)}`);
      
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'get_health_summary':
            console.error('Calling getHealthSummary...');
            return await this.getHealthSummary(args as { timeframe: string });
          case 'get_workout_details':
            console.error('Calling getWorkoutDetails...');
            return await this.getWorkoutDetails(args as { limit?: number });
          case 'get_heart_rate_zones':
            console.error('Calling getHeartRateZones...');
            return await this.getHeartRateZones(args as { date?: string });
          default:
            console.error(`Unknown tool: ${name}`);
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`❌ Error in tool handler: ${error}`);
        console.error(`Stack trace: ${error instanceof Error ? error.stack : 'No stack'}`);
        
        // Return a valid error response instead of throwing
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async getHealthSummary(args: { timeframe: string }) {
    console.error(`=== GET HEALTH SUMMARY STARTED ===`);
    console.error(`Timeframe: ${args.timeframe}`);
    
    try {
      // Validate timeframe
      if (!['today', 'week', 'month'].includes(args.timeframe)) {
        throw new Error(`Invalid timeframe: ${args.timeframe}. Must be 'today', 'week', or 'month'.`);
      }

      const healthData = await this.healthReader.getHealthSummary(args.timeframe as 'today' | 'week' | 'month');
      
      console.error(`Health data retrieved: ${JSON.stringify(healthData)}`);
      
      // Validate that we got valid data
      if (!healthData || typeof healthData.steps === 'undefined') {
        throw new Error('Invalid health data received');
      }

      const responseText = `Apple Watch Health Summary (${args.timeframe}):

Steps: ${healthData.steps}
Resting Heart Rate: ${healthData.heartRate.resting} bpm
Average Heart Rate: ${healthData.heartRate.average} bpm
Max Heart Rate: ${healthData.heartRate.max} bpm
Sleep: ${healthData.sleepHours} hours
Active Calories: ${healthData.activeCalories}
Workouts: ${healthData.workouts}`;

      console.error(`Response prepared: ${responseText.substring(0, 100)}...`);

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Error in getHealthSummary: ${error}`);
      
      // Return a meaningful error message
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving health data: ${error instanceof Error ? error.message : String(error)}. Please check the server logs for more details.`,
          },
        ],
      };
    }
  }

  private async getWorkoutDetails(args: { limit?: number }) {
    console.error(`=== GET WORKOUT DETAILS STARTED ===`);
    const limit = args.limit || 5;
    
    try {
      const mockWorkouts = [
        {
          date: '2025-07-17',
          type: 'Running',
          duration: '32:15',
          distance: '4.2 miles',
          avgHeartRate: 145,
          maxHeartRate: 172,
          calories: 320,
          pace: '7:41 /mile'
        },
        {
          date: '2025-07-16',
          type: 'Strength Training',
          duration: '45:30',
          avgHeartRate: 110,
          maxHeartRate: 140,
          calories: 280
        },
        {
          date: '2025-07-15',
          type: 'Cycling',
          duration: '1:15:22',
          distance: '18.5 miles',
          avgHeartRate: 135,
          maxHeartRate: 165,
          calories: 450,
          avgSpeed: '14.7 mph'
        }
      ];

      const workouts = mockWorkouts.slice(0, limit);
      
      return {
        content: [
          {
            type: 'text',
            text: `Recent Workouts (${workouts.length}):\n${JSON.stringify(workouts, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Error in getWorkoutDetails: ${error}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving workout data: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async getHeartRateZones(args: { date?: string }) {
    console.error(`=== GET HEART RATE ZONES STARTED ===`);
    const date = args.date || new Date().toISOString().split('T')[0];
    
    try {
      const mockZones = {
        date: date,
        zones: {
          zone1_recovery: { range: '52-104 bpm', timeInZone: '4:32:15', percentage: 18.9 },
          zone2_aerobic: { range: '105-125 bpm', timeInZone: '2:15:30', percentage: 9.4 },
          zone3_anaerobic: { range: '126-146 bpm', timeInZone: '0:45:22', percentage: 3.1 },
          zone4_neuromuscular: { range: '147-167 bpm', timeInZone: '0:12:08', percentage: 0.8 },
          zone5_anaerobic: { range: '168+ bpm', timeInZone: '0:02:30', percentage: 0.2 }
        },
        totalActiveTime: '7:47:45',
        restingHeartRate: 52,
        maxHeartRate: 172
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `Heart Rate Zones for ${date}:\n${JSON.stringify(mockZones, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      console.error(`❌ Error in getHeartRateZones: ${error}`);
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving heart rate zones: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  async run() {
    try {
      console.error('Starting Apple Watch MCP Server...');
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Apple Watch MCP Server running...');
      
      // Keep the process alive
      process.on('SIGINT', () => {
        console.error('Server shutting down...');
        process.exit(0);
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        process.exit(1);
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        process.exit(1);
      });
      
    } catch (error) {
      console.error('Server startup error:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new AppleWatchMCPServer();
server.run().catch((error) => {
  console.error('Fatal server error:', error);
  process.exit(1);
});