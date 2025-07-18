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

  constructor(exportPath: string) {
    this.exportPath = exportPath;
  }

  async parseHealthData(timeframe: 'today' | 'week' | 'month'): Promise<HealthData> {
    try {
      const xmlPath = path.join(this.exportPath, 'export.xml');
      
      if (!fs.existsSync(xmlPath)) {
        throw new Error('export.xml not found');
      }

      const xmlData = fs.readFileSync(xmlPath, 'utf8');
      
      return new Promise((resolve, reject) => {
        parseString(xmlData, (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          
          try {
            const healthData = this.extractHealthMetrics(result, timeframe);
            resolve(healthData);
          } catch (parseError) {
            reject(parseError);
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to parse Apple Health data: ${error}`);
    }
  }

  private extractHealthMetrics(xmlResult: any, timeframe: string): HealthData {
    const records = xmlResult?.HealthData?.Record || [];
    const workouts = xmlResult?.HealthData?.Workout || [];
    
    // Get date range for filtering
    const { startDate, endDate } = this.getDateRange(timeframe);
    
    // Debug: Log date range
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

    // Debug: Log counts
    console.error(`Found ${filteredRecords.length} health records and ${filteredWorkouts.length} workouts`);
    
    // Sample some records to see dates
    if (filteredRecords.length > 0) {
      const sampleRecord = filteredRecords[0];
      console.error(`Sample record date: ${sampleRecord.$.startDate}, type: ${sampleRecord.$.type}`);
    }

    // Extract specific metrics
    const steps = this.extractSteps(filteredRecords);
    const heartRate = this.extractHeartRate(filteredRecords);
    const sleep = this.extractSleep(filteredRecords);
    const activeCalories = this.extractActiveCalories(filteredRecords);
    const workoutCount = filteredWorkouts.length;

    console.error(`Extracted: steps=${steps}, HR=${JSON.stringify(heartRate)}, sleep=${sleep}, calories=${activeCalories}, workouts=${workoutCount}`);

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
    
    return Math.round(calorieRecords.reduce((total, record) => {
      return total + parseFloat(record.$.value);
    }, 0));
  }
}