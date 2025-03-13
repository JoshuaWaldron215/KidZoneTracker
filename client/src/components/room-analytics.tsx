import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Room, RoomHistory } from "@shared/schema";

interface RoomAnalyticsProps {
  room: Room;
}

export function RoomAnalytics({ room }: RoomAnalyticsProps) {
  const { data: history = [], isLoading } = useQuery<RoomHistory[]>({
    queryKey: [`/api/rooms/${room.id}/history`],
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });

  // Separate regular updates from reset data
  const regularUpdates = history.filter(entry => !entry.isReset);
  const resetEntries = history.filter(entry => entry.isReset);

  // Process data for daily view
  const dailyData = regularUpdates.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = {
        date,
        average: entry.newOccupancy,
        count: 1,
        max: entry.newOccupancy,
      };
    } else {
      acc[date].average += entry.newOccupancy;
      acc[date].count += 1;
      acc[date].max = Math.max(acc[date].max, entry.newOccupancy);
    }
    return acc;
  }, {} as Record<string, { date: string; average: number; count: number; max: number }>);

  // Process data for weekly view
  const weeklyData = regularUpdates.reduce((acc, entry) => {
    const date = new Date(entry.timestamp);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toLocaleDateString();

    if (!acc[weekKey]) {
      acc[weekKey] = {
        week: `Week of ${weekStart.toLocaleDateString()}`,
        average: entry.newOccupancy,
        count: 1,
        max: entry.newOccupancy,
      };
    } else {
      acc[weekKey].average += entry.newOccupancy;
      acc[weekKey].count += 1;
      acc[weekKey].max = Math.max(acc[weekKey].max, entry.newOccupancy);
    }
    return acc;
  }, {} as Record<string, { week: string; average: number; count: number; max: number }>);

  // Process data for peak hours
  const peakHoursData = regularUpdates.reduce((acc, entry) => {
    const hour = new Date(entry.timestamp).getHours();
    if (!acc[hour]) {
      acc[hour] = {
        hour,
        count: 1,
        totalOccupancy: entry.newOccupancy,
      };
    } else {
      acc[hour].count += 1;
      acc[hour].totalOccupancy += entry.newOccupancy;
    }
    return acc;
  }, {} as Record<number, { hour: number; count: number; totalOccupancy: number }>);

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const standardHour = hour % 12 || 12;
    return `${standardHour}:00 ${period}`;
  };

  // Format data for charts
  const dailyChartData = Object.values(dailyData).map(day => ({
    date: day.date,
    average: Math.round(day.average / day.count),
    max: day.max,
  }));

  const weeklyChartData = Object.values(weeklyData).map(week => ({
    week: week.week,
    average: Math.round(week.average / week.count),
    max: week.max,
  }));

  const peakData = Array.from({ length: 24 }, (_, i) => {
    const hourData = peakHoursData[i] || { hour: i, count: 0, totalOccupancy: 0 };
    return {
      hour: formatHour(i),
      average: hourData.count > 0 ? Math.round(hourData.totalOccupancy / hourData.count) : 0,
    };
  });

  const tooltipFormatter = (value: number) => [`${value} children`, 'Occupancy'];
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded p-2 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm">
              {entry.name}: {entry.value} children
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Room Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <p>Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="peak">Peak Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="pt-4">
            <div className="h-[300px]">
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, room.maxCapacity]} />
                    <Tooltip content={customTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#8884d8"
                      name="Average Occupancy"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      stroke="#82ca9d"
                      name="Max Occupancy"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No daily data available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="pt-4">
            <div className="h-[300px]">
              {weeklyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, room.maxCapacity]} />
                    <Tooltip content={customTooltip} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#8884d8"
                      name="Weekly Average"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      stroke="#82ca9d"
                      name="Weekly Peak"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No weekly data available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="peak" className="pt-4">
            <div className="h-[300px]">
              {peakData.some(data => data.average > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="hour" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      interval={0}
                    />
                    <YAxis domain={[0, room.maxCapacity]} />
                    <Tooltip formatter={tooltipFormatter} />
                    <Legend />
                    <Bar
                      dataKey="average"
                      fill="#8884d8"
                      name="Average Occupancy"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No peak hours data available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {resetEntries.length > 0 && (
          <div className="mt-4 p-4 border rounded">
            <h3 className="font-medium mb-2">Daily Reset Summary</h3>
            <div className="text-sm text-muted-foreground">
              Last reset: {new Date(resetEntries[resetEntries.length - 1].timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}