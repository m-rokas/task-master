import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  UserMinus,
  UserPlus,
  User,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader } from '../components/DashboardHeader';

const stats = [
  {
    label: 'Total Revenue',
    value: '$128,430',
    trend: 'up',
    trendValue: '+12.5%',
    icon: CreditCard,
  },
  {
    label: 'Active Subscriptions',
    value: '12,540',
    trend: 'up',
    trendValue: '+8.2%',
    icon: Users,
  },
  {
    label: 'Churn Rate',
    value: '2.4%',
    trend: 'down',
    trendValue: '-0.5%',
    icon: UserMinus,
    isGoodDown: true,
  },
  {
    label: 'New Signups',
    value: '842',
    trend: 'up',
    trendValue: '+15.3%',
    icon: UserPlus,
  },
];

const recentSubscriptions = [
  { name: 'Sarah Wilson', plan: 'Pro Plan • Monthly', amount: '$29.00' },
  { name: 'Marcus Chen', plan: 'Enterprise • Annual', amount: '$899.00' },
  { name: 'Lena Dunham', plan: 'Pro Plan • Monthly', amount: '$29.00' },
];

const systemHealth = [
  { label: 'Server Load', value: '24%', percentage: 24, color: 'bg-primary' },
  {
    label: 'Database Latency',
    value: '12ms',
    percentage: 15,
    color: 'bg-emerald-500',
  },
  {
    label: 'Storage Used',
    value: '68%',
    percentage: 68,
    color: 'bg-orange-500',
  },
];

export function AdminDashboard() {
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark">
      <Sidebar variant="admin" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title="Admin Dashboard"
          breadcrumbs={[
            { label: 'Home', href: '#' },
            { label: 'Dashboard Statistics' },
          ]}
        />

        <div className="flex-1 overflow-y-auto p-8 max-w-[1200px] mx-auto w-full">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-xl bg-white dark:bg-[#111318] p-6 border border-slate-200 dark:border-[#3b4354] shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 dark:text-[#9da6b9] text-sm font-medium">
                    {stat.label}
                  </p>
                  <stat.icon
                    className={`size-5 ${
                      stat.label === 'Churn Rate'
                        ? 'text-red-500'
                        : 'text-primary'
                    }`}
                  />
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">
                  {stat.value}
                </p>
                <div className="flex items-center gap-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp
                      className={`size-4 ${stat.isGoodDown ? 'text-red-500' : 'text-emerald-500'}`}
                    />
                  ) : (
                    <TrendingDown className="size-4 text-emerald-500" />
                  )}
                  <p
                    className={`text-sm font-medium ${stat.isGoodDown && stat.trend === 'up' ? 'text-red-500' : 'text-emerald-500'}`}
                  >
                    {stat.trendValue}{' '}
                    <span className="text-slate-400 font-normal">
                      vs last month
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Chart Section */}
          <div className="bg-white dark:bg-[#111318] rounded-xl border border-slate-200 dark:border-[#3b4354] p-8 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-slate-900 dark:text-white text-xl font-bold">
                  Monthly Recurring Revenue (MRR) Growth
                </h3>
                <p className="text-slate-500 dark:text-[#9da6b9] text-sm">
                  Review your subscription revenue trends over the past 7
                  months.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-slate-900 dark:text-white text-2xl font-extrabold leading-none">
                    $92,400
                  </p>
                  <p className="text-emerald-500 text-sm font-bold">
                    +18.4% growth
                  </p>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-[#282e39]" />
                <select className="bg-slate-100 dark:bg-[#282e39] border-none rounded-lg text-sm font-medium focus:ring-primary text-slate-900 dark:text-white cursor-pointer">
                  <option>Last 7 Months</option>
                  <option>Last Year</option>
                  <option>All Time</option>
                </select>
              </div>
            </div>

            {/* Chart Container */}
            <div className="relative w-full h-[320px]">
              <svg
                className="w-full h-full"
                viewBox="0 0 1000 300"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="adminChartGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#135bec" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#135bec" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line
                  x1="0"
                  y1="50"
                  x2="1000"
                  y2="50"
                  stroke="#282e39"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="125"
                  x2="1000"
                  y2="125"
                  stroke="#282e39"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="200"
                  x2="1000"
                  y2="200"
                  stroke="#282e39"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="275"
                  x2="1000"
                  y2="275"
                  stroke="#282e39"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
                {/* Area */}
                <path
                  d="M0,250 C100,220 200,240 300,180 C400,120 500,150 600,100 C700,50 850,80 1000,30 L1000,300 L0,300 Z"
                  fill="url(#adminChartGradient)"
                />
                {/* Line */}
                <path
                  d="M0,250 C100,220 200,240 300,180 C400,120 500,150 600,100 C700,50 850,80 1000,30"
                  fill="none"
                  stroke="#135bec"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                {/* Data points */}
                <circle cx="0" cy="250" r="5" fill="#135bec" />
                <circle cx="300" cy="180" r="5" fill="#135bec" />
                <circle cx="600" cy="100" r="5" fill="#135bec" />
                <circle
                  cx="1000"
                  cy="30"
                  r="6"
                  fill="#135bec"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="flex justify-between mt-4 px-2">
              {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL'].map((month) => (
                <p
                  key={month}
                  className="text-[#9da6b9] text-xs font-bold tracking-wider"
                >
                  {month}
                </p>
              ))}
            </div>
          </div>

          {/* Secondary Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Subscriptions */}
            <div className="bg-white dark:bg-[#111318] rounded-xl border border-slate-200 dark:border-[#3b4354] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900 dark:text-white font-bold">
                  Recent Subscriptions
                </h4>
                <button className="text-primary text-sm font-semibold hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-4">
                {recentSubscriptions.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#282e39] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-100 dark:bg-[#282e39] flex items-center justify-center">
                        <User className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {sub.name}
                        </p>
                        <p className="text-xs text-slate-500">{sub.plan}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {sub.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-[#111318] rounded-xl border border-slate-200 dark:border-[#3b4354] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-900 dark:text-white font-bold">
                  System Health
                </h4>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                  All Operational
                </span>
              </div>
              <div className="space-y-6 pt-2">
                {systemHealth.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-medium mb-1.5">
                      <span className="text-slate-500 dark:text-[#9da6b9]">
                        {item.label}
                      </span>
                      <span className="text-slate-900 dark:text-white">
                        {item.value}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-[#282e39] rounded-full overflow-hidden">
                      <div
                        className={`${item.color} h-full`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
