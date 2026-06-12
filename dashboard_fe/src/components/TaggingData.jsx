import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tooltip, Layout,Checkbox, Button, Space, Input, Tag, Dropdown, Select } from 'antd';
import { Database, Play, HelpCircle, Search, Tag as TagIcon } from 'lucide-react';
import { API_ENDPOINTS } from '../utils/config';
import Markdown from 'react-markdown';
import { FilterOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined, DeleteOutlined, UserOutlined,InfoCircleFilled  } from '@ant-design/icons';
const { Header} = Layout;
const { Option } = Select;

const TaggingData = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalUncheckedRecords, setTotalUncheckedRecords] = useState(0);
  const [dataUnchecked, setDataUnchecked] = useState([]);
  const [modifiedData, setModifiedData] = useState({}); // Lưu các session_id và dữ liệu đã thay đổi trước khi submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mapping màu sắc
  const getStatusColor = (colorName) => {
    switch(colorName) {
      case 'success': return '#52c41a';
      case 'error': return '#ff4d4f';
      case 'warning': return '#faad14';
      default: return '#212020ff';
    }
  };

  const statusMap = {
    0: { text: 'Chưa kiểm tra', color: 'default', icon: <ClockCircleOutlined /> },
    1: { text: 'Đúng', color: 'success', icon: <CheckCircleOutlined /> },
    2: { text: 'Sai', color: 'error', icon: <CloseCircleOutlined /> },
    3: { text: 'Xoá', color: 'warning', icon: <DeleteOutlined /> },
  };

  const handleStatusUpdate = (sessionId, newStatus) => {
    setDataUnchecked(prev => prev.map(item => {
      if (item.session_id === sessionId) {
        const updatedItem = { ...item, is_checked: newStatus };
        setModifiedData(prevMod => ({ ...prevMod, [sessionId]: updatedItem }));
        return updatedItem;
      }
      return item;
    }));
  };

  const handleNoteUpdate = (sessionId, newNote) => {
    setDataUnchecked(prev => prev.map(item => {
      if (item.session_id === sessionId) {
        const updatedItem = { ...item, note: newNote };
        setModifiedData(prevMod => ({ ...prevMod, [sessionId]: updatedItem }));
        return updatedItem;
      }
      return item;
    }));
  };

  const handleBulkUpdate = async () => {
    // Phân loại các bản ghi cần cập nhật và xóa
    const modifiedList = Object.values(modifiedData);
    const toTag = modifiedList.filter(item => item.is_checked === 1 || item.is_checked === 2);
    const toDelete = modifiedList.filter(item => item.is_checked === 3);

    if (toTag.length === 0 && toDelete.length === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let errors = [];

    try {
      // 1. Xử lý cập nhật trạng thái (Tagging)
      if (toTag.length > 0) {
        const taggingUrl = new URL(API_ENDPOINTS.TAGGING, window.location.origin);
        const tagResponse = await fetch(taggingUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: toTag.map(item => ({
              session_id: item.session_id,
              is_checked: item.is_checked,
              note: item.note || ""
            }))
          })
        });
        if (tagResponse.ok) {
          const res = await tagResponse.json();
          successCount += res.updated_count;
        } else {
          errors.push("Lỗi cập nhật trạng thái");
        }
      }

      // 2. Xử lý xóa (Deleting)
      if (toDelete.length > 0) {
        const deleteResponse = await fetch(API_ENDPOINTS.DELETING, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_ids: toDelete.map(item => ({ session_id: item.session_id }))
          })
        });
        if (deleteResponse.ok) {
          const res = await deleteResponse.json();
          successCount += res.updated_count;
        } else {
          errors.push("Lỗi xóa bản ghi");
        }
      }

      if (errors.length > 0) {
        alert("Kết quả: " + errors.join(", "));
      } else {
        alert(`Đã cập nhật thành công ${successCount} bản ghi`);
      }

      setModifiedData({});
      loadUncheckedData();
    } catch (error) {
      console.error("Lỗi cập nhật tổng thể:", error);
      alert("Có lỗi xảy ra trong quá trình cập nhật");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Định nghĩa cột của bảng và style
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
      width: 100,
      render: (text) => <Tooltip title={text}><div className="truncate w-full">{text}</div></Tooltip>,
    },
    {
      title: 'Session ID',
      dataIndex: 'session_id',
      key: 'session_id',
      width: 120,
      render: (text) => <Tooltip title={text}><div className="truncate w-full font-mono text-[11px]">{text}</div></Tooltip>,
    },
    {
      title: 'Câu hỏi',
      dataIndex: 'question',
      key: 'question',
      width: 250,
      render: (text) => <div className="line-clamp-2">{text}</div>,
    },
    {
      title: 'Câu trả lời',
      dataIndex: 'answer',
      key: 'answer',
      width: 400,
      render: (text) => (
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <Markdown
            components={{
              a: ({...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
              )
            }}>{text}</Markdown>
        </div>
      ),
    },
    {
      title: 'Model',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 150,
      align: 'center',
      render: (name) => <Tag color="blue" className="text-[10px] m-0">{name}</Tag>,
    },
    {
      title: 'Thời gian thực thi',
      dataIndex: 'time_executed',
      key: 'time_executed',
      width: 110,
      align: 'center',
      render: (time) => <span className="text-orange-600 font-medium text-[12px]">{time}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_checked',
      key: 'is_checked',
      width: 150,
      align: 'center',
      render: (currentStatus, record) => {
        const config = statusMap[currentStatus] || statusMap[0];
        return (
          <Select
            value={currentStatus}
            style={{ 
              width: '100%', 
              color: getStatusColor(config.color),
              fontWeight: 'bold'
            }}
            variant="borderless"
            onChange={(newStatus) => {
              handleStatusUpdate(record.session_id, newStatus);
            }}
          >
            {Object.entries(statusMap).map(([key, cfg]) => (
              <Option key={key} value={Number(key)}>
                <Space>
                  <span style={{ color: getStatusColor(cfg.color) }}>{cfg.icon} {cfg.text}</span>
                </Space>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: 200,
      render: (text, record) => {
        if (record.is_checked === 2) {
          return (
            <Input
              value={text}
              variant="borderless"
            //   placeholder="Lý do sai..."
              onChange={(e) => handleNoteUpdate(record.session_id, e.target.value)}
              size="small"
              className="border-red-200"
            />
          );
        }
        return <span className="text-gray-400 italic text-[12px]"></span>;
      },
    },
  ];

  const alwaysVisibleKeys = ['index', 'question', 'answer', 'is_checked'];
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(columns.map(c => c.key));
  const filteredColumns = columns.filter(col => alwaysVisibleKeys.includes(col.key) || visibleColumnKeys.includes(col.key));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [userList, setUserList] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelList, setModelList] = useState([]);
  
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

  // Gọi API lấy thông tin dữ liệu chưa được đánh nhãn
  const loadUncheckedData = useCallback(async (page = currentPage, limit = pageSize) => {
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
      requestUrl.searchParams.set('is_checked', '0');
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
      setDataUnchecked(Array.isArray(data.data) ? data.data : []);
      setTotalUncheckedRecords(Number(data.total_records) || 0);
      // Keep FE pagination state from the user's action to avoid page reset.
      setCurrentPage(page);
      setPageSize(limit);
    } catch (error) {
      console.error("Lỗi fetch dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, selectedUser ,selectedModel ,searchQuery]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadUncheckedData();
    }, 500);
    return () => clearTimeout(timerId);
  }, [loadUncheckedData]);
    

    return (
        <Layout className="min-h-screen bg-[#f1f5f9] font-sans">
            {/* 1. Header */}
            <Header className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm sticky">
                <div className="flex items-center gap-2">
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'dashboard',
                                    label: 'LLM Analytics Overview',
                                    icon: <Database size={16} />,
                                    onClick: () => onNavigate('dashboard'),
                                },
                                {
                                    key: 'playground',
                                    label: 'LLM Prompt Response',
                                    icon: <Play size={16} />,
                                    onClick: () => onNavigate('playground'),
                                },
                                {
                                    key: 'tagging',
                                    label: 'Tagging Dataset',
                                    icon: <TagIcon size={16} />,
                                    disabled: true,
                                },
                            ],
                        }}
                        trigger={['click']}
                        placement="bottomLeft"
                    >
                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center">
                            <TagIcon size={18} color="white" />
                        </div>
                    </Dropdown>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-gray-400 leading-none tracking-tighter">LLM TAGGING</h1>
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Workspace / TAGGING</span>
                    </div>

                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Tagging Mode
                    </div>
                    <HelpCircle size={20} className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
                </div>
            </Header>
            <Layout className="flex-1 overflow-y-auto bg-gray-50 p-6">
           
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
                    onPressEnter={() => loadUncheckedData(1, pageSize)}
                    suffix={<Search size={16} className="text-gray-400 cursor-pointer" 
                    onClick={() => loadUncheckedData(1, pageSize)} />}
                    className="h-9 rounded-md"
                  />
                </div>

                {/* Users Select */}
                <div className="w-full md:w-60">
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                    <UserOutlined className="mr-1" /> Users
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
                    <InfoCircleFilled className="mr-1" /> Model
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
            {/* Thanh cập nhật trạng thái - Hiển thị khi có sự thay đổi */}
            {Object.keys(modifiedData).length > 0 && (
              <div className="mt-2 mb-2 p-4 bg-orange-50 border border-orange-200 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 shadow-md">
                <Space size="middle">
                  <Button
                    type="primary"
                    size="middle"
                    loading={isSubmitting}
                    onClick={handleBulkUpdate}
                    icon={<CheckCircleOutlined />}
                    className="bg-orange-600 hover:bg-orange-700 border-none px-6"
                  >
                    Cập nhật trạng thái
                    </Button>
                    <Button 
                    size="middle" 
                    onClick={() => {
                      setModifiedData({});
                      loadUncheckedData();
                    }}
                    disabled={isSubmitting}
                  >
                    Hủy bỏ
                  </Button>
                </Space>
              </div>
            )}

            {/* Table results */}
            <div className="mb-4 rounded border border-gray-200 bg-white p-2 shadow-sm">
              <div className="antd-table-container">
                <Table
                  columns={filteredColumns}
                            dataSource={dataUnchecked}
                            loading={loading}
                            rowClassName={(record, index) =>
                                index % 2 === 0 ? '!bg-[#f4f7f9]' : '!bg-blue-50'
                            }
                            className="custom-ant-table"
                            // rowSelection={rowSelection}
                            rowKey="session_id"
                            pagination={{
                                current: currentPage,      // page_index từ API
                                pageSize: pageSize,        // số lượng bản ghi mỗi trang
                                total: totalUncheckedRecords,       // total_record từ API
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                                defaultPageSize: 20,
                                locale: { items_per_page: '' },
                                onChange: (page, size) => {
                                    // Khi người dùng bấm chuyển trang hoặc đổi số lượng bản ghi/trang
                                    const nextSize = size || pageSize;
                                    setCurrentPage(page);
                                    setPageSize(nextSize);
                                    loadUncheckedData(page, nextSize);
                                },
                                showTotal: (total) => `Tổng cộng ${total} dòng dữ liệu`,
                            }}
                            scroll={{ x: 1000 }}
                            bordered
                            size="middle"
                        />
                    </div>
                </div>
            </Layout>
        </Layout>
    )
}

export default TaggingData