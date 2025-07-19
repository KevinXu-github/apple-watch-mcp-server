import fs from 'fs';
import path from 'path';
import { parseString } from 'xml2js';
import { HealthData } from './appleHealth';

interface HealthRecord {
  $: {
    type: string;
    value: string;
    unit?: string;
    startDate: string;
    endDate: string;
    sourceName: string;
  };
}

interface WorkoutRecord {
  $: {
    workoutActivityType: string;
    duration: string;
    totalDistance?: string;
    totalEnergyBurned?: string;
    startDate: string;
    endDate: string;
  };
}

export class AppleHealthXMLParser {
  private exportPath: string;
  private readonly MAX_FILE_SIZE_MB = 100; // Skip parsing files larger than 100MB
  private readonly PARSE_TIMEOUT_MS = 10000; // 10 second timeout

  constructor(exportPath: string) {
    this.exportPath = exportPath;
  }

  async parseHealthData(timeframe: 'today' | 'week' | 'month'): Promise<HealthData> {
    try {
      const xmlPath = path.join(this.exportPath, 'export.xml');
      
      if (!fs.existsSync(xmlPath)) {
        throw new Error('export.xml not found');
      }

      // Check file size first
      const stats = fs.statSync(xmlPath);
      const fileSizeMB = stats.size / 1024 / 1024;
      
      console.error(`XML file size: ${fileSizeMB.toFixed(2)} MB`);
      
      // If file is too large, skip parsing and throw error to use mock data
      if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
        console.error(`❌ File too large (${fileSizeMB.toFixed(2)} MB > ${this.MAX_FILE_SIZE_MB} MB). Using mock data.`);
        throw new Error(`File too large: ${fileSizeMB.toFixed(2)} MB`);
      }

      // For smaller files, try parsing with a timeout
      console.error('✅ File size acceptable, attempting to parse...');
      return await this.parseWithTimeout(xmlPath, timeframe);
      
    } catch (error) {
      console.error(`XML parsing failed: ${error}`);
      throw new Error(`Failed to parse Apple Health data: ${error}`);
    }
  }

  private async parseWithTimeout(xmlPath: string, timeframe: string): Promise<HealthData> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        console.error(`❌ XML parsing timed out after ${this.PARSE_TIMEOUT_MS}ms`);
        reject(new Error('XML parsing timeout'));
      }, this.PARSE_TIMEOUT_MS);

      try {
        console.error('📖 Reading XML file...');
        const xmlData = fs.readFileSync(xmlPath, 'utf8');
        
        console.error('🔄 Parsing XML...');
        parseString(xmlData, (err, result) => {
          clearTimeout(timeout); // Clear timeout on completion
          
          if (err) {
            console.error(`❌ XML parse error: ${err}`);
            reject(err);
            return;
          }
          
          try {
            console.error('✅ XML parsed successfully, extracting metrics...');
            const healthData = this.extractHealthMetrics(result, timeframe);
            console.error(`✅ Metrics extracted: ${JSON.stringify(healthData)}`);
            resolve(healthData);
          } catch (parseError) {
            console.error(`❌ Metric extraction error: ${parseError}`);
            reject(parseError);
          }
        });
      } catch (readError) {
        clearTimeout(timeout);
        console.error(`❌ File read error: ${readError}`);
        reject(readError);
      }
    });
  }

  private extractHealthMetrics(xmlResult: any, timeframe: string): HealthData {
    const records = xmlResult?.HealthData?.Record || [];
    const workouts = xmlResult?.HealthData?.Workout || [];
    
    console.error(`Total records in XML: ${Array.isArray(records) ? records.length : 0}`);
    console.error(`Total workouts in XML: ${Array.isArray(workouts) ? workouts.length : 0}`);
    
    // Get date range for filtering
    const { startDate, endDate } = this.getDateRange(timeframe);
    
    console.error(`Filtering data from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Filter records by date range
    const filteredRecords = records.filter((record: HealthRecord) => {
      const recordDate = new Date(record.$.startDate);
      return recordDate >= startDate && recordDate <= endDate;
    });

    const filteredWorkouts = workouts.filter((workout: WorkoutRecord) => {
      const workoutDate = new Date(workout.$.startDate);
      return workoutDate >= startDate && workoutDate <= endDate;
    });

    console.error(`Filtered records: ${filteredRecords.length}, Filtered workouts: ${filteredWorkouts.length}`);
    
    // Extract specific metrics
    const steps = this.extractSteps(filteredRecords);
    const heartRate = this.extractHeartRate(filteredRecords);
    const sleep = this.extractSleep(filteredRecords);
    const activeCalories = this.extractActiveCalories(filteredRecords);
    const workoutCount = filteredWorkouts.length;

    console.error(`Final metrics - Steps: ${steps}, HR: ${JSON.stringify(heartRate)}, Sleep: ${sleep}h, Calories: ${activeCalories}, Workouts: ${workoutCount}`);

    return {
      steps,
      heartRate,
      sleepHours: sleep,
      activeCalories,
      workouts: workoutCount
    };
  }

  private getDateRange(timeframe: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    let startDate = new Date(now);
    
    switch (timeframe) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  }

  private extractSteps(records: HealthRecord[]): number {
    const stepRecords = records.filter(r => 
      r.$.type === 'HKQuantityTypeIdentifierStepCount'
    );
    
    console.error(`Found ${stepRecords.length} step records`);
    
    return stepRecords.reduce((total, record) => {
      return total + parseFloat(record.$.value);
    }, 0);
  }

  private extractHeartRate(records: HealthRecord[]): { resting: number; average: number; max: number } {
    const heartRateRecords = records.filter(r => 
      r.$.type === 'HKQuantityTypeIdentifierHeartRate'
    );

    const restingHRRecords = records.filter(r => 
      r.$.type === 'HKQuantityTypeIdentifierRestingHeartRate'
    );

    console.error(`Found ${heartRateRecords.length} heart rate records, ${restingHRRecords.length} resting HR records`);

    if (heartRateRecords.length === 0) {
      return { resting: 60, average: 80, max: 120 };
    }

    const heartRates = heartRateRecords.map(r => parseFloat(r.$.value));
    const average = Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length);
    const max = Math.round(Math.max(...heartRates));
    
    // Get most recent resting heart rate
    let resting = 60; // default
    if (restingHRRecords.length > 0) {
      const sortedResting = restingHRRecords
        .sort((a, b) => new Date(b.$.startDate).getTime() - new Date(a.$.startDate).getTime());
      resting = Math.round(parseFloat(sortedResting[0].$.value));
    }

    return { resting, average, max };
  }

  private extractSleep(records: HealthRecord[]): number {
    const sleepRecords = records.filter(r => 
      r.$.type === 'HKCategoryTypeIdentifierSleepAnalysis'
    );

    console.error(`Found ${sleepRecords.length} sleep records`);

    if (sleepRecords.length === 0) {
      return 7.5; // default
    }

    // Calculate total sleep duration in hours
    const totalSleepMinutes = sleepRecords.reduce((total, record) => {
      const startDate = new Date(record.$.startDate);
      const endDate = new Date(record.$.endDate);
      const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      return total + durationMinutes;
    }, 0);

    return Math.round((totalSleepMinutes / 60) * 10) / 10; // Round to 1 decimal
  }

  private extractActiveCalories(records: HealthRecord[]): number {
    const calorieRecords = records.filter(r => 
      r.$.type === 'HKQuantityTypeIdentifierActiveEnergyBurned'
    );
    
    console.error(`Found ${calorieRecords.length} calorie records`);
    
    return Math.round(calorieRecords.reduce((total, record) => {
      return total + parseFloat(record.$.value);
    }, 0));
  }
}