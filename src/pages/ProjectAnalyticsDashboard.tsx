import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader } from '../components/DashboardHeader';

const stats = [
  {
    label: 'Total Tasks',
    value: '1,284',
    trend: 'up',
    trendValue: '12%',
    color: 'primary',
  },
  {
    label: 'Completed Tasks',
    value: '856',
    trend: 'down',
    trendValue: '5%',
    color: 'red',
  },
  {
    label: 'Overdue',
    value: '12',
    trend: 'down',
    trendValue: '2%',
    color: 'emerald',
  },
  {
    label: 'Avg. Completion Time',
    value: '3.2d',
    trend: 'up',
    trendValue: '10%',
    color: 'red',
  },
];

const priorityData = [
  { label: 'Urgent', percentage: 15, color: 'bg-red-400' },
  { label: 'High', percentage: 45, color: 'bg-primary' },
  { label: 'Medium', percentage: 30, color: 'bg-slate-400' },
  { label: 'Low', percentage: 10, color: 'bg-slate-200 dark:bg-slate-700' },
];

const teamMembers = [
  {
    name: 'Marcus Stone',
    role: 'UI Designer',
    tasks: 42,
    completion: 94,
    workload: 75,
    status: 'Optimal Capacity',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  },
  {
    name: 'Sarah Chen',
    role: 'Backend Dev',
    tasks: 38,
    completion: 88,
    workload: 95,
    status: 'Overloaded',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  },
  {
    name: 'Elena Rodriguez',
    role: 'QA Specialist',
    tasks: 25,
    completion: 72,
    workload: 45,
    status: 'Under-utilized',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  },
  {
    name: 'David Miller',
    role: 'Product Owner',
    tasks: 12,
    completion: 100,
    workload: 25,
    status: 'Under-utilized',
    avatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
  },
];

export function ProjectAnalyticsDashboard() {
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <Sidebar variant="user" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title="Project Analytics" />

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#1a2130] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium">
                      {stat.label}
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                      {stat.value}
                    </h3>
                  </div>
                  <div
                    className={`flex items-center text-sm font-bold px-2 py-1 rounded ${
                      stat.trend === 'up' && stat.color === 'primary'
                        ? 'text-emerald-500 bg-emerald-500/10'
                        : stat.trend === 'down' && stat.color === 'emerald'
                          ? 'text-emerald-500 bg-emerald-500/10'
                          : 'text-red-400 bg-red-400/10'
                    }`}
                  >
                    {stat.trend === 'up' ? (
                      <TrendingUp className="size-4 mr-1" />
                    ) : (
                      <TrendingDown className="size-4 mr-1" />
                    )}
                    {stat.trendValue}
                  </div>
                </div>
                <div className="h-12 w-full">
                  <svg className="w-full h-full" viewBox="0 0 100 30">
                    <path
                      d={
                        index === 0
                          ? 'M0 25 Q 10 20, 20 22 T 40 15 T 60 18 T 80 5 T 100 10'
                          : index === 1
                            ? 'M0 10 Q 15 15, 30 12 T 50 20 T 70 18 T 100 25'
                            : 'M0 28 L10 20 L20 22 L30 15 L40 18 L50 8 L60 12 L70 5 L80 15 L90 10 L100 2'
                      }
                      fill="none"
                      stroke={
                        stat.color === 'primary'
                          ? '#135bec'
                          : stat.color === 'red'
                            ? '#f87171'
                            : '#10b981'
                      }
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Area Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1a2130] p-6 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    Task Completion Trends
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-[#9da6b9]">
                    Daily velocity for the last 30 days
                  </p>
                </div>
                <select className="bg-slate-100 dark:bg-background-dark border-none rounded-lg text-sm font-medium text-slate-900 dark:text-white focus:ring-primary py-2 px-4">
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                </select>
              </div>
              <div className="h-[300px] w-full relative">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#135bec" stopOpacity="0.3" />
                      <stop
                        offset="100%"
                        stopColor="#135bec"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 250 Q 50 200, 100 220 T 200 150 T 300 180 T 400 100 T 500 120 T 600 50 T 700 80 T 800 30 T 900 60 T 1000 40 V 300 H 0 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0 250 Q 50 200, 100 220 T 200 150 T 300 180 T 400 100 T 500 120 T 600 50 T 700 80 T 800 30 T 900 60 T 1000 40"
                    fill="none"
                    stroke="#135bec"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="flex justify-between mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {['Oct 01', 'Oct 10', 'Oct 20', 'Oct 30'].map((date) => (
                    <span
                      key={date}
                      className="text-xs font-bold text-slate-400 dark:text-[#9da6b9]"
                    >
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="bg-white dark:bg-[#1a2130] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Tasks by Priority
              </h4>
              <p className="text-sm text-slate-500 dark:text-[#9da6b9] mb-8">
                Workload distribution
              </p>
              <div className="relative flex-1 flex flex-col items-center justify-center">
                <div className="size-48 rounded-full border-[16px] border-slate-100 dark:border-slate-800 flex items-center justify-center relative">
                  <div
                    className="absolute inset-0 rounded-full border-[16px] border-transparent border-t-primary border-r-primary"
                    style={{ transform: 'rotate(45deg)' }}
                  />
                  <div
                    className="absolute inset-0 rounded-full border-[16px] border-transparent border-b-red-400"
                    style={{ transform: 'rotate(0deg)' }}
                  />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      1,284
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#9da6b9] uppercase tracking-wider font-bold">
                      Total
                    </p>
                  </div>
                </div>
                <div className="mt-8 w-full space-y-3">
                  {priorityData.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`size-3 rounded-full ${item.color}`} />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Team Performance Table */}
          <div className="bg-white dark:bg-[#1a2130] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Team Performance
                </h4>
                <p className="text-sm text-slate-500 dark:text-[#9da6b9]">
                  Task metrics by individual
                </p>
              </div>
              <button className="flex items-center gap-2 text-primary text-sm font-bold hover:underline">
                View Full Report
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-background-dark/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-[#9da6b9] uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-[#9da6b9] uppercase tracking-wider">
                      Assigned
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-[#9da6b9] uppercase tracking-wider">
                      Completion Rate
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-[#9da6b9] uppercase tracking-wider">
                      Workload
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teamMembers.map((member) => (
                    <tr
                      key={member.name}
                      className="hover:bg-slate-50 dark:hover:bg-background-dark/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center"
                            style={{
                              backgroundImage: `url('${member.avatar}')`,
                            }}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {member.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-[#9da6b9]">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {member.tasks} Tasks
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            member.completion >= 90
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {member.completion}%
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              member.workload > 90
                                ? 'bg-red-400'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${member.workload}%` }}
                          />
                        </div>
                        <p
                          className={`text-[10px] mt-1 uppercase font-bold ${
                            member.workload > 90
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {member.status}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
