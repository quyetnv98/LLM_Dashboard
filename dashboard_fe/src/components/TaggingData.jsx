// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, Typography, Space, Upload, InputNumber, Input, Tag, Divider, List, Skeleton, Row, Col, Dropdown, Select } from 'antd';
import { UploadOutlined, FileTextOutlined, SendOutlined, SettingOutlined, DeleteOutlined, UserOutlined, PlaySquareOutlined } from '@ant-design/icons';
import { Database, Play, LayoutPanelLeft, HelpCircle, Clock, PlayIcon, Tag as TagIcon } from 'lucide-react';
import { API_ENDPOINTS } from '../utils/config';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const TaggingData = ({ onNavigate }) => {
    return (
        <Layout className="min-h-screen bg-[#f1f5f9] font-sans">
            {/* 1. Header (Có thể tái sử dụng Header cũ của bạn) */}
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
                                    label: 'LLM Playground',
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
            <Layout>
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
            </Layout>
        </Layout>
    )
}

export default TaggingData