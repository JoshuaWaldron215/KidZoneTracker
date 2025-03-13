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

  // Process data for daily view
  const dailyData = history.reduce((acc, entry) => {
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

  // Process data for peak hours
  const peakHoursData = history.reduce((acc, entry) => {
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

  const chartData = Object.values(dailyData).map(day => ({
    date: day.date,
    average: Math.round(day.average / day.count),
    max: day.max,
  }));

  const peakData = Array.from({ length: 24 }, (_, i) => {
    const hourData = peakHoursData[i] || { hour: i, count: 0, totalOccupancy: 0 };
    return {
      hour: `${i.toString().padStart(2, '0')}:00`,
      average: hourData.count > 0 ? Math.round(hourData.totalOccupancy / hourData.count) : 0,
    };
  });

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
        <Tabs defaultValue="occupancy">
          <TabsList>
            <TabsTrigger value="occupancy">Occupancy Trends</TabsTrigger>
            <TabsTrigger value="peak">Peak Hours</TabsTrigger>
          </TabsList>
          <TabsContent value="occupancy" className="pt-4">
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, room.maxCapacity]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#8884d8"
                      name="Average Occupancy"
                    />
                    <Line
                      type="monotone"
                      dataKey="max"
                      stroke="#82ca9d"
                      name="Max Occupancy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No historical data available
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
                    <XAxis dataKey="hour" />
                    <YAxis domain={[0, room.maxCapacity]} />
                    <Tooltip />
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
      </CardContent>
    </Card>
  );
}