import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'; import { Database, HelpCircle, ChevronDown, Search, VerifiedIcon, Clock, LucideFileX, Play, LayoutPanelLeft } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Space, Button, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Select, Input, Checkbox, Popover, Dropdown } from 'antd';
import ReactMarkdown from 'react-markdown';
import Markdown from 'react-markdown';
import './App.css';
import Playground from '../components/Playground';

const env = window.__ENV__ || {};
const { BE_URL = '', BE_PORT = '', ENDPOINT = {} } = env;
// URL Endpoint config
function buildApiUrl(beUrl = '', bePort = '', path = '') {
  if (!beUrl || !bePort || !path) {
    return '';
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${beUrl}:${bePort}${normalizedPath}`;
}

// Pie Chart Config
const RADIAN = Math.PI / 180;
// Hàm vẽ label tùy chỉnh
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-[10px] font-bold"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

const COLORS = [
  '#10b981', // Xanh lá cho 'Unchecked'
  '#3b82f6', // Xanh dương cho 'Correct'
  '#ef4444',  // Đỏ cho 'Incorrect'
];

// Hàm định dạng tên hiển thị cho Lengend Pie Chart
const renderColorfulLegendText = (value) => {
  const statusMap = {
    'correct': 'Đúng',
    'incorrect': 'Sai',
    'unchecked': 'Chưa kiểm tra'
  };
  return statusMap[value] || value;
}


// Top Card Config
const MetricCard = ({ icon, title, value }) => (
  <div className="bg-white p-4 rounded-md border border-gray-200 flex items-center gap-4 shadow-sm">
    <div className="p-3 bg-blue-50 text-blue-500 rounded-md">{icon}</div>
    <div>
      <div className="text-xs text-gray-500 uppercase font-semibold">{title}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  </div>
);

// Table Config
// a. Cấu hình các cột của bảng
const columns = [
  {
    title: 'STT',
    key: 'index',
    width: 50,
    align: 'center',
    render: (text, record, index) => index + 1,
  },
  {
    title: 'User ID',
    dataIndex: 'user_id',
    key: 'user_id',
    width: 70,
    // ellipsis: true,
    render: (text) => <Tooltip title={text}>{text}</Tooltip>,
  },
  {
    title: 'Session ID',
    dataIndex: 'session_id',
    key: 'session_id',
    width: 120,
    // ellipsis: true,
    render: (text) => <Tooltip title={text}>{text}</Tooltip>,
  },
  {
    title: 'Câu hỏi (Question)',
    dataIndex: 'question',
    key: 'question',
    width: 200,
    // ellipsis: true,
    render: (text) => <Tooltip title={text}>{text}</Tooltip>,
  },
  {
    title: 'Câu trả lời (Answer)',
    dataIndex: 'answer',
    key: 'answer',
    width: 450,
    // ellipsis: { showTitle: false },
    render: (text) => (
      <div style={{
        maxHeight: '200px', // Câu trả lời có thể cho cao hơn một chút
        overflowY: 'auto',
        paddingRight: '5px'
      }}>
        <Markdown>{text}</Markdown>
      </div>
    ),
  },
  {
    title: 'Model',
    dataIndex: 'model_name',
    key: 'model_name',
    width: 180,
    align: 'center',
    render: (name) => <Tag color="blue" className="text-[10px]">{name}</Tag>,
  },
  {
    title: 'Thời gian thực thi',
    dataIndex: 'time_executed',
    key: 'time_executed',
    width: 150,
    align: 'center',
    render: (time) => (
      <span className="text-orange-600 font-medium">
        <ClockCircleOutlined className="mr-1" /> {time}
      </span>
    ),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'is_checked', // Giả sử field này trả về 0, 1, 2
    key: 'is_checked',
    width: 100,
    align: 'center',
    onFilter: (value, record) => record.is_checked === value,
    render: (status) => {
      // 1. Định nghĩa mapping cho các trạng thái
      const statusMap = {
        1: { text: 'Đúng', color: 'success', icon: <CheckCircleOutlined /> },
        2: { text: 'Sai', color: 'error', icon: <CloseCircleOutlined /> },
        0: { text: 'Chưa kiểm tra', color: 'default', icon: <ClockCircleOutlined /> },
      };
      // 2. Lấy config tương ứng, mặc định là 'Chưa kiểm tra' nếu status không hợp lệ
      const config = statusMap[status] || statusMap[2];
      return (
        <Tag icon={config.icon} color={config.color}>
          {config.text.toUpperCase()}
        </Tag>
      );
    },
  },
  {
    title: 'Ghi chú',
    key: 'note',
    dataIndex: 'note',
    width: 100,
    align: 'center',
    render: (text) => <Tooltip title={text}><i style={{ color: 'gray', fontStyle: 'italic' }}>{text}</i></Tooltip>,
  },
];


export default function App() {
  const [dataPie, setDataPie] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isCCheckTrue, setIsCCheckTrue] = useState(0);
  const [isCCheckFalse, setIsCCheckFalse] = useState(0);
  const [isCCheckUnchecked, setIsCCheckUnchecked] = useState(0);

  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Số bản ghi mỗi trang
  // các State của Righ Side
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState(''); // Status dùng cho việc tìm kiếm dữ liệu trong db,
  const [activePage, setActivePage] = useState('dashboard');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(columns.map(c => c.key));

  // 1. Lấy dữ liệu thống kê từ DB
  useEffect(() => {
    const fetchCountData = async () => {
      try {

        const endpointDataCount = buildApiUrl(BE_URL, BE_PORT, ENDPOINT.GET_DATA_COUNT);

        if (!endpointDataCount) {
          console.warn('Missing ENDPOINT_DATA_COUNT in config');
          return;
        }
        const respone = await fetch(endpointDataCount, { method: "GET" });
        if (!respone.ok) {
          throw new Error(`HTTP ${respone.status} when calling ${endpointDataCount}`);
        }
        const data = await respone.json();
        console.log(data);
        const formattedData = Object.keys(data).map((key) => ({
          name: key,
          value: Number(data[key]) || 0,
        })).filter((item) => item.name !== 'total');

        setDataPie(formattedData);
        setTotalRecords(Number(data.total) || 0);
        setIsCCheckTrue(Number(data.correct) || 0);
        setIsCCheckFalse(Number(data.incorrect) || 0);
        setIsCCheckUnchecked(Number(data.unchecked) || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchCountData();
  }, []);

  // 2. Gọi API lấy thông tin bản dữ liệu
  const loadTableData = useCallback(async (page = currentPage, limit = pageSize) => {
    setLoading(true);
    try {
      const endpointDataAll = buildApiUrl(BE_URL, BE_PORT, ENDPOINT.SEARCH);
      if (!endpointDataAll) {
        console.warn('Missing ENDPOINT.GET_DATA_ALL in config');
        return;
      }
      const requestUrl = new URL(endpointDataAll);
      if (searchQuery !== "") {
        requestUrl.searchParams.set('query', String(searchQuery));
      }
      if (status !== "") {
        requestUrl.searchParams.set('is_checked', String(status));
      }
      requestUrl.searchParams.set('page_index', String(page));
      requestUrl.searchParams.set('page_size', String(limit));

      const respone = await fetch(requestUrl.toString(), { method: "GET" });
      if (!respone.ok) {
        throw new Error(`HTTP ${respone.status} when calling ${requestUrl.toString()}`);
      }
      const data = await respone.json();
      console.log(data);
      setDataSource(Array.isArray(data.data) ? data.data : []);
      setTotalRecords(Number(data.total_records) || 0);
      // Keep FE pagination state from the user's action to avoid page reset.
      setCurrentPage(page);
      setPageSize(limit);
    } catch (error) {
      console.error("Lỗi fetch dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, status, currentPage, pageSize]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadTableData();
    }, 500);
    return () => clearTimeout(timerId);
  }, [loadTableData]);

  const filteredColumns = columns.filter(col => visibleColumnKeys.includes(col.key));

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans">
      {activePage === 'dashboard' ? (
        <>
          {/* Header Overview */}
          <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'dashboard',
                      label: 'LLM Analytics Overview',
                      icon: <Database size={16} />,
                      onClick: () => setActivePage('dashboard'),
                      disabled: activePage === 'dashboard',
                    },
                    {
                      key: 'playground',
                      label: 'LLM Playground',
                      icon: <Play size={16} />,
                      onClick: () => setActivePage('playground'),
                      disabled: activePage === 'playground',
                    },
                    {
                      key: 'compare',
                      label: 'Compare Model',
                      icon: <LayoutPanelLeft size={16} />,
                      onClick: () => console.log('Chuyển sang Compare Model'),
                    },
                  ],
                }}
                trigger={['click']}
                placement="bottomLeft"
              >
                <div className="bg-blue-600 p-1.5 rounded-sm cursor-pointer hover:bg-blue-700 transition-colors shadow-sm">
                  <Database size={18} color="white" />
                </div>
              </Dropdown>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-800 leading-none">LLM Analytics Overview</h1>
                <span className="text-[10px] text-gray-400 font-medium uppercase mt-1">Workspace / Analytics</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                System Active
              </div>
              <HelpCircle size={20} className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
            </div>
          </header>

          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                {/* 4 Top Cards */}
                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                  {/* Left Side: 4 Metric Cards in a grid */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                    <MetricCard icon={<Database size={24} />} title="Tổng số bản ghi" value={totalRecords} />
                    <MetricCard icon={<VerifiedIcon size={24} />} title="Số lượng đúng" value={isCCheckTrue} />
                    <MetricCard icon={<LucideFileX size={24} />} title="Số lượng sai" value={isCCheckFalse} />
                    <MetricCard icon={<Clock size={24} />} title="Số lượng chưa đánh giá" value={isCCheckUnchecked} />
                  </div>

                  {/* Right Side: Pie Chart */}
                  <div className="lg:w-[450px] bg-white border border-gray-200 rounded-md shadow-sm flex flex-col items-center justify-center p-4">
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dataPie}
                            innerRadius={40}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            stroke="none"
                          >
                            {dataPie.map((entry, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip />
                          <Legend
                            formatter={renderColorfulLegendText}
                            verticalAlign="bottom"
                            align="center"
                            layout="horizontal"
                            iconType="circle"
                            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
              <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
                {/* Search Input */}
                <div className="w-full md:w-72">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                    <Search size={12} className="inline mr-1" /> Tìm kiếm câu hỏi
                  </label>
                  <Input
                    placeholder="Nhập nội dung câu hỏi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onPressEnter={() => loadTableData(1, 10)}
                    suffix={<Search size={16} className="text-gray-400 cursor-pointer" onClick={() => loadTableData(1, 10)} />}
                    className="h-9 rounded-md"
                  />
                </div>

                {/* Status Select */}
                <div className="w-full md:w-40">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    <FilterOutlined className="mr-1" /> Trạng thái
                  </label>
                  <Select
                    className="w-full h-9"
                    value={status}
                    onChange={(value) => {
                      setStatus(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '', label: 'Tất cả trạng thái' },
                      { value: '0', label: 'Chưa đánh giá' },
                      { value: '1', label: 'Đúng' },
                      { value: '2', label: 'Sai' }
                    ]}
                  />
                </div>

                {/* Column Visibility Checkboxes */}
                <div className="flex-1 min-w-[400px]">
                  <div className="flex items-center gap-2 mb-2">
                    <SettingOutlined className="text-gray-400 text-[10px]" />
                    <span className="text-[10px] uppercase font-bold text-gray-400">Hiển thị cột</span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {columns.map(col => (
                      <Checkbox
                        key={col.key}
                        checked={visibleColumnKeys.includes(col.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumnKeys([...visibleColumnKeys, col.key]);
                          } else {
                            if (visibleColumnKeys.length > 1) {
                              setVisibleColumnKeys(visibleColumnKeys.filter(k => k !== col.key));
                            }
                          }
                        }}
                        className="text-[11px] font-medium text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        {col.title}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table results */}
            <div className="mb-4 rounded border border-gray-200 bg-white p-2 shadow-sm">
              <div className="antd-table-container">
                <Table
                  columns={filteredColumns}
                  dataSource={dataSource}
                  loading={loading}
                  rowClassName={(record, index) =>
                    index % 2 === 0 ? '!bg-[#f4f7f9]' : '!bg-white'
                  }
                  className="custom-ant-table"
                  rowKey="session_id"
                  pagination={{
                    current: currentPage,      // page_index từ API
                    pageSize: pageSize,        // số lượng bản ghi mỗi trang
                    total: totalRecords,       // total_record từ API
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    locale: { items_per_page: '' },
                    onChange: (page, size) => {
                      // Khi người dùng bấm chuyển trang hoặc đổi số lượng bản ghi/trang
                      const nextSize = size || pageSize;
                      setCurrentPage(page);
                      console.log(currentPage);
                      setPageSize(nextSize);
                      loadTableData(page, nextSize);
                    },
                    showTotal: (total) => `Tổng cộng ${total} bản ghi`,
                  }}
                  scroll={{ x: 1000 }}
                  bordered
                  size="middle"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <Playground onNavigate={(page) => setActivePage(page)} />
      )}
    </div>
  );
}
