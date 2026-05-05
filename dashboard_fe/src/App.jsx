import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ChartTooltip, Legend, } from 'recharts'; import { Database, HelpCircle, ChevronDown, Search, VerifiedIcon, Clock, LucideFileX, Play, LayoutPanelLeft, Tag as TagIcon } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { Table, Tag, Space, Button, Tooltip, Layout } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Select, Input, Checkbox, Popover, Dropdown } from 'antd';
import { API_ENDPOINTS } from './utils/config';
import Markdown from 'react-markdown';
import './App.css';
import Playground from './components/Playground';
import CompareRespone from './components/CompareRespone';
import TaggingData from './components/TaggingData';


const { Header } = Layout;


// Top Card Config
const MetricCard = ({ icon, title, value, onClick }) => (
  <div
    className={`bg-white p-4 rounded-md border border-gray-200 flex items-center gap-4 shadow-sm ${onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group' : ''}`}
    onClick={onClick}
  >
    <div className={`p-3 rounded-md transition-colors ${onClick ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' : 'bg-blue-50 text-blue-500'}`}>{icon}</div>
    <div>
      <div className="text-xs text-gray-500 uppercase font-semibold">{title}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  </div>
);



export default function App() {
  const [dataPie, setDataPie] = useState([]);
  const [totalAllRecords, setTotalAllRecords] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isCheckTrue, setIsCheckTrue] = useState(0);
  const [isCheckFalse, setIsCheckFalse] = useState(0);
  const [isCheckUnchecked, setIsCheckUnchecked] = useState(0);

  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // Số bản ghi mỗi trang (Mặc định 20)
  // các State của Righ Side
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState(''); // Status dùng cho việc tìm kiếm dữ liệu trong db,
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState('');
  const [userList, setUserList] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelList, setModelList] = useState([]);

  const COLORS = [
    '#10b981', // Xanh lá 'Unchecked'
    '#3b82f6', // Xanh dương 'Correct'
    '#ef4444',  // Đỏ cho 'Incorrect'
  ];

  const STATUS_LABELS = {
    'correct': 'Đúng',
    'incorrect': 'Sai',
    'unchecked': 'Chưa đánh giá'
  };

  // Hàm định dạng tên hiển thị cho Legend Pie Chart
  const renderColorfulLegendText = (value) => {
    return STATUS_LABELS[value] || value;
  }
  // Table Config
  // a. Cấu hình các cột của bảng
  const columns = [
    {
      title: 'STT',
      key: 'index',
      width: 50,
      align: 'center',
      render: (text, record, index) => (currentPage - 1) * pageSize + index + 1,
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
          <Markdown
            components={{
              a: ({...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
              )
            }}
          >{text}</Markdown>
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
          0: { text: 'Chưa đánh giá', color: 'default', icon: <ClockCircleOutlined /> },
          1: { text: 'Đúng', color: 'success', icon: <CheckCircleOutlined /> },
          2: { text: 'Sai', color: 'error', icon: <CloseCircleOutlined /> },
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
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(columns.map(c => c.key));
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

    // Lấy list users , model trong db
  useEffect(() => {
    const fetchUserModel = async () => {
      try {
        if (!API_ENDPOINTS.LIST_USERS_MODELS) {
          console.log('Missing ENDPOINT.LIST_USERS_MODELS in config');
          return;
        }
        const respone = await fetch(API_ENDPOINTS.LIST_USERS_MODELS, { method: "GET" });
        if (!respone.ok) {
          throw new Error(`HTTP ${respone.status} when calling ${API_ENDPOINTS.LIST_USERS_MODELS}`);
        }
        const data = await respone.json();
        console.log(data);
        console.log("Dữ liệu user mới:", data.users_list); // Log trực tiếp ở đây
        setUserList(data.users_list);
        setModelList(data.models_list);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchUserModel();
  }, []);

  // 1. Lấy dữ liệu thống kê từ DB
  useEffect(() => {
    const fetchCountData = async () => {
      try {
        if (!API_ENDPOINTS.GET_DATA_COUNT) {
          console.warn('Missing ENDPOINT_DATA_COUNT in config');
          return;
        }
        const respone = await fetch(API_ENDPOINTS.GET_DATA_COUNT, { method: "GET" });
        if (!respone.ok) {
          throw new Error(`HTTP ${respone.status} when calling ${API_ENDPOINTS.GET_DATA_COUNT}`);
        }
        const data = await respone.json();
        console.log(data);
        const formattedData = Object.keys(data).map((key) => ({
          name: key,
          value: Number(data[key]) || 0,
        })).filter((item) => item.name !== 'total');

        setDataPie(formattedData);
        setTotalRecords(Number(data.total) || 0);
        setIsCheckTrue(Number(data.correct) || 0);
        setIsCheckFalse(Number(data.incorrect) || 0);
        setIsCheckUnchecked(Number(data.unchecked) || 0);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchCountData();
  }, [activePage]);


  // 2. Gọi API lấy thông tin bản dữ liệu
  const loadTableData = useCallback(async (page = currentPage, limit = pageSize) => {
    setLoading(true);
    try {
      if (!API_ENDPOINTS.SEARCH) {
        console.warn('Missing ENDPOINT.GET_DATA_ALL in config');
        return;
      }
      const requestUrl = new URL(API_ENDPOINTS.SEARCH);
      if (searchQuery !== "") {
        requestUrl.searchParams.set('query', String(searchQuery));
      }
      if (status !== "") {
        requestUrl.searchParams.set('is_checked', String(status));
      }
      if (selectedUser !== "") {
        requestUrl.searchParams.set('is_user', String(selectedUser));
      }
      if (selectedModel !== "") {
        requestUrl.searchParams.set('is_model', String(selectedModel));
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
      setTotalAllRecords(Number(data.total_records) || 0);
      // Keep FE pagination state from the user's action to avoid page reset.
      setCurrentPage(page);
      setPageSize(limit);
    } catch (error) {
      console.error("Lỗi fetch dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [status, searchQuery, currentPage, pageSize,selectedUser,selectedModel]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadTableData();
    }, 500);
    return () => clearTimeout(timerId);
  }, [loadTableData]);

  const filteredColumns = columns.filter(col => visibleColumnKeys.includes(col.key));

  // Cấu hình chọn dòng
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      if (keys.length <= 2) {
        setSelectedRowKeys(keys);
        setSelectedRows(rows);
      }
    },
    getCheckboxProps: (record) => ({
      disabled: selectedRowKeys.length >= 2 && !selectedRowKeys.includes(record.session_id),
    }),
  };

  const handleNavigate = (page) => {
    if (page === 'dashboard') {
      setSelectedUser('');
      setSelectedModel('');
      setStatus('');
      setSearchQuery('');
      setCurrentPage(1);
    }
    setActivePage(page);
  };

  return (
    <Layout className="bg-[#f8fafc] min-h-screen font-sans">
      {activePage === 'dashboard' ? (
        <>
          {/* Header Overview */}
          <Header className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm sticky">
            <div className="flex items-center gap-2">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'dashboard',
                      label: 'LLM Analytics Overview',
                      icon: <Database size={16} />,
                      onClick: () => handleNavigate('dashboard'),
                      disabled: activePage === 'dashboard',
                    },
                    {
                      key: 'playground',
                      label: 'LLM Prompt Response',
                      icon: <Play size={16} />,
                      onClick: () => handleNavigate('playground'),
                      disabled: activePage === 'playground',
                    },
                    {
                      key: 'tagging',
                      label: 'Tagging Dataset',
                      icon: <TagIcon size={16} />,
                      onClick: () => handleNavigate('tagging'),
                      disabled: activePage === 'tagging',
                    },
                  ],
                }}
                trigger={['click']}
                placement="bottomLeft"
              >
                <div className="bg-blue-600 p-1.5 rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center">
                  <Database size={18} color="white" />
                </div>
              </Dropdown>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-300 leading-none tracking-tighter uppercase">LLM Analytics Overview</h1>
                <div className="h-4 w-px bg-gray-200 mx-1"></div>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Workspace / Analytics</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Analytics Mode
              </div>
              <HelpCircle size={20} className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
            </div>
          </Header>

          <div className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                {/* 4 Top Cards */}
                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                  {/* Left Side: 4 Metric Cards in a grid */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
                    <MetricCard icon={<Database size={24} />} title="Tổng số bản ghi" value={totalRecords} />
                    <MetricCard icon={<VerifiedIcon size={24} />} title="Số lượng đúng" value={isCheckTrue} />
                    <MetricCard icon={<LucideFileX size={24} />} title="Số lượng sai" value={isCheckFalse} />
                    <MetricCard
                      icon={<Clock size={24} />}
                      title="Số lượng chưa đánh giá"
                      value={isCheckUnchecked}
                      onClick={() => handleNavigate('tagging')}
                    />
                  </div>

                  {/* Right Side: Pie Chart */}
                  <div className="lg:w-[450px] bg-white border border-gray-200 rounded-md shadow-sm flex flex-col items-center justify-center p-4">
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dataPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {dataPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <ChartTooltip
                            formatter={(value, name) => [value, STATUS_LABELS[name] || name]}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend iconType="circle" formatter={renderColorfulLegendText} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm flex flex-col gap-4">
              {/* 1. Khu vực bộ lọc */}
              <div className="flex flex-wrap items-start gap-x-10 gap-y-6">
                {/* Search Input */}
                <div className="flex-1 lg:max-w-[40%] min-w-[300px]">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
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

                {/* Users Select */}
                <div className="w-full md:w-60">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    <FilterOutlined className="mr-1" /> Users
                  </label>
                  <Select
                    className="w-full h-9"
                    value={selectedUser}
                    onChange={(value) => {
                      setSelectedUser(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '', label: 'Tất cả' },
                      ...userList.map((user) => ({
                        value: user,
                        label: user,
                      })),
                    ]}
                  />
                </div>
                {/* Model Select */}
                <div className="w-full md:w-60">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    <FilterOutlined className="mr-1" /> Model
                  </label>
                  <Select
                    className="w-full h-9"
                    value={selectedModel}
                    onChange={(value) => {
                      setSelectedModel(value);
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '', label: 'Tất cả' },
                      ...modelList.map((model) => ({
                        value: model,
                        label: model,
                      })),
                    ]}
                  />
                </div>
                {/* Status Select */}
                <div className="w-full md:w-60">
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
           </div>
              {/*Hiển thị cột */}
                <div className="flex-1 min-w-[400px] ">
                  <div className="flex items-center gap-2 mb-2 mt-2">
                  <SettingOutlined className="text-gray-400 text-[10px]" />
                  <span className="text-[10px] uppercase font-bold text-gray-400">Hiển thị cột</span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
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

            {/* So sánh Bar - Hiển thị khi có chọn */}
            {selectedRows.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selectedRows.map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-blue-800">
                    Đã chọn {selectedRows.length}/2 câu hỏi để so sánh
                  </span>
                </div>
                <Space>
                  <Button size="small" variant="ghost" onClick={() => { setSelectedRowKeys([]); setSelectedRows([]); }}>Hủy</Button>
                  <Button
                    type="primary"
                    size="middle"
                    disabled={selectedRows.length !== 2}
                    onClick={() => handleNavigate('compare')}
                    icon={<LayoutPanelLeft size={16} />}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    So sánh
                  </Button>
                </Space>
              </div>
            )}

            {/* Table results */}
            <div className="mb-4 rounded border border-gray-200 bg-white p-2 shadow-sm">
              <div className="antd-table-container">
                <Table
                  columns={filteredColumns}
                  dataSource={dataSource}
                  loading={loading}
                  rowClassName={(record, index) =>
                    index % 2 === 0 ? '!bg-[#f4f7f9]' : '!bg-white'
                    // index % 2 === 0 ? '!bg-[#f4f7f9]' : '!bg-blue-50'
                  }
                  className="custom-ant-table"
                  rowSelection={rowSelection}
                  rowKey="session_id"
                  pagination={{
                    current: currentPage,      // page_index từ API
                    pageSize: pageSize,        // số lượng bản ghi mỗi trang
                    total: totalAllRecords,       // total_record từ API
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                    defaultPageSize: 20,
                    locale: { items_per_page: '' },
                    onChange: (page, size) => {
                      // Khi người dùng bấm chuyển trang hoặc đổi số lượng bản ghi/trang
                      const nextSize = size || pageSize;
                      setCurrentPage(page);
                      setPageSize(nextSize);
                      loadTableData(page, nextSize);
                    },
                    showTotal: (total) => `Tổng cộng ${total} dòng dữ liệu`,
                  }}
                  scroll={{ x: 1000 }}
                  bordered
                  size="middle"
                />
              </div>
            </div>
          </div>
        </>
      ) : activePage === 'playground' ? (
        <Playground onNavigate={handleNavigate} />
      ) : activePage === 'tagging' ? (
        <TaggingData onNavigate={handleNavigate} />
      ) : (
        <CompareRespone
          data={selectedRows}
          onNavigate={handleNavigate}
        />
      )}
    </Layout>
  );
}
