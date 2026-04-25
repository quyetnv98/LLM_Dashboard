import React, { useState, useCallback } from 'react';
import { Layout, Card, Button, Typography, Space, Upload, InputNumber, Input, Tag, Divider, message, List, Skeleton, Row, Col, Dropdown, Select } from 'antd';
import { UploadOutlined, FileTextOutlined, SendOutlined, SettingOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { Database, Play, LayoutPanelLeft, HelpCircle, Clock } from 'lucide-react';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

export default function Playground({ onNavigate }) {
    // --- STATE ---
    // 1. Quản lý danh sách câu hỏi và câu trả lời {id, question, answer, loading}
    const [testItems, setTestItems] = useState([
        { id: 1, question: 'Căn cước công dân gắn chip có tác dụng gì?', answer: '', loading: false }
    ]);
    const [numQuestions, setNumQuestions] = useState(1); // Số lượng ô muốn test thủ công
    const [globalLoading, setGlobalLoading] = useState(false); // Loading cho nút "Run All"

    // 2. State cho các cấu hình khác (Model, Params)
    const [selectedModel, setSelectedModel] = useState('gemma-4-2b-a4b-it-4bit');
    const [concurrency, setConcurrency] = useState(1); // Số luồng test (1-5)
    const [userId, setUserId] = useState('user_test_01'); // User ID cho session test

    // --- LOGIC HANDLING ---

    // A. Xử lý khi nhập số lượng câu hỏi thủ công
    const handleCreateEmptyInputs = () => {
        if (numQuestions <= 0) {
            message.warning("Vui lòng nhập số lượng câu hỏi hợp lệ.");
            return;
        }
        const newItems = Array.from({ length: numQuestions }, (_, i) => ({
            id: Date.now() + i, // Tạo ID duy nhất
            question: '',
            answer: '',
            loading: false
        }));
        setTestItems(newItems);
        message.success(`Đã tạo ${numQuestions} ô test mới.`);
    };

    // B. Xử lý khi Upload file .txt
    const handleUploadFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            // Giả sử mỗi câu hỏi nằm trên một dòng
            const questions = content.split('\n').filter(q => q.trim() !== '');

            if (questions.length === 0) {
                message.error("File txt trống hoặc không đúng định dạng (mỗi dòng 1 câu).");
                return;
            }

            const newItems = questions.map((q, i) => ({
                id: Date.now() + i,
                question: q.trim(),
                answer: '',
                loading: false
            }));
            setTestItems(newItems);
            message.success(`Đã tải ${questions.length} câu hỏi từ file.`);
        };
        reader.readAsText(file);
        return false; // Ngăn AntD tự động upload lên server
    };

    // C. Xử lý cập nhật nội dung câu hỏi từng ô
    const handleQuestionChange = (id, value) => {
        setTestItems(prev => prev.map(item => item.id === id ? { ...item, question: value } : item));
    };

    // D. Xử lý gọi LLM cho TỪNG câu (Single Run)
    const runSingleTest = async (id) => {
        let currentPrompt = '';

        // 1. Set loading và lấy nội dung prompt hiện tại
        setTestItems(prev => {
            const newItems = prev.map(item => {
                if (item.id === id) {
                    currentPrompt = item.question;
                    return { ...item, loading: true, answer: '' };
                }
                return item;
            });
            return newItems;
        });

        if (!currentPrompt) {
            setTestItems(prev => prev.map(item => item.id === id ? { ...item, loading: false } : item));
            return;
        }

        try {
            const startTime = Date.now();
            // Giả lập gọi API
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
            const endTime = Date.now();
            const executionTime = ((endTime - startTime) / 1000).toFixed(2);

            const fakeAnswer = `Đây là câu trả lời giả lập cho câu hỏi: "${currentPrompt}". Model ${selectedModel} đã xử lý xong.`;

            // 2. Cập nhật answer, tắt loading và lưu thời gian
            setTestItems(prev => prev.map(item => item.id === id ? {
                ...item,
                answer: fakeAnswer,
                loading: false,
                time_executed: executionTime
            } : item));
        } catch (error) {
            setTestItems(prev => prev.map(item => item.id === id ? { ...item, loading: false, answer: 'Lỗi kết nối LLM.' } : item));
        }
    };

    // F. Xử lý chạy TẤT CẢ các câu hỏi (Run All với Concurrency)
    const runAllTests = async () => {
        if (testItems.length === 0) {
            message.info("Chưa có câu hỏi nào để test.");
            return;
        }

        const questionsToRun = testItems.filter(item => item.question.trim() !== '');
        if (questionsToRun.length === 0) {
            message.warning("Vui lòng nhập nội dung câu hỏi trước khi chạy.");
            return;
        }

        setGlobalLoading(true);
        message.loading({ content: `Đang chạy ${questionsToRun.length} câu hỏi với ${concurrency} luồng...`, key: 'runAll' });

        // Sử dụng Pool để chạy song song theo số luồng
        const queue = [...questionsToRun];
        const workers = Array(Math.min(concurrency, queue.length)).fill(null).map(async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (item) {
                    await runSingleTest(item.id);
                }
            }
        });

        await Promise.all(workers);
        setGlobalLoading(false);
        message.success({ content: "Đã hoàn thành tất cả các test!", key: 'runAll', duration: 3 });
    };

    // E. Xử lý xóa ô test
    const handleDeleteItem = (id) => {
        setTestItems(prev => prev.filter(item => item.id !== id));
    };

    return (
        <Layout className="min-h-screen bg-[#f1f5f9] font-sans">
            {/* 1. Header (Có thể tái sử dụng Header cũ của bạn) */}
            <Header className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm sticky top-0 z-10 h-16">
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
                                    disabled: true,
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
                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center">
                            <SettingOutlined style={{ fontSize: '18px', color: 'white' }} />
                        </div>
                    </Dropdown>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-gray-400 leading-none tracking-tighter">LLM PROMPT</h1>
                        <div className="h-4 w-[1px] bg-gray-200 mx-1"></div>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Workspace / Playground</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Playground Mode
                    </div>
                    <HelpCircle size={20} className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
                </div>
            </Header>

            <Layout>
                {/* 2. SIDER: Configuration (Phần nhập câu hỏi nằm ở đây) */}
                <Sider width={320} className="bg-[#f8fafc] p-6 border-r border-gray-100" theme="light">
                    <Space direction="vertical" size="large" className="w-full">

                        {/* Khối 2a: Chọn Model */}
                        <div className="space-y-2">
                            <Text strong className="text-[10px] text-gray-500 uppercase tracking-widest block">Cấu hình Model</Text>
                            {/* <ModelSelect defaultValue={selectedModel} onChange={setSelectedModel} /> */}
                            <Select
                                value={selectedModel}
                                onChange={(_, option) => setSelectedModel(option.label)}
                                className="w-full rounded-md"
                                options={[
                                    { value: 0, label: 'gemma-4-2b-a4b-it-4bit' },
                                    { value: 1, label: 'gemma4-4b-it-4bit' },
                                ]}
                            />
                            {/* Giả lập Select cũ */}
                        </div>

                        <Divider className="m-0 border-gray-100" />

                        {/* MỚI: User ID */}
                        <div className="space-y-2">
                            <Text strong className="text-[10px] text-gray-500 uppercase tracking-widest block">USERNAME </Text>
                            <Input
                                placeholder="Nhập User ID..."
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                prefix={<UserOutlined className="text-gray-400" />}
                                className="rounded-md h-9"
                            />
                        </div>

                        <Divider className="m-0 border-gray-100" />

                        {/* Khối 2b: TRỌNG TÂM - Nhập câu hỏi (Upload hoặc Số lượng) */}
                        <div className="space-y-6">
                            <Text strong className="text-[10px] text-gray-500 uppercase tracking-widest block">Cấu hình Test</Text>
                            <Card size="small" bordered={false} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                <Space direction="vertical" className="w-full">
                                    <Text type="secondary" className="text-xs">Số luồng chạy song song (Threads)</Text>
                                    <Select
                                        value={concurrency}
                                        onChange={setConcurrency}
                                        className="w-full rounded-md"
                                        options={[
                                            { value: 1, label: '1 Luồng' },
                                            { value: 2, label: '2 Luồng' },
                                            { value: 3, label: '3 Luồng' },
                                            { value: 4, label: '4 Luồng' },
                                            { value: 5, label: '5 Luồng (Max)' },
                                        ]}
                                    />
                                </Space>
                            </Card>

                            <Card size="small" bordered={false} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                <Space direction="vertical" className="w-full">
                                    <Text type="secondary" className="text-xs">Tạo ô trống (Nhập thủ công)</Text>
                                    <div className="flex gap-2">
                                        <InputNumber
                                            min={1}
                                            max={50}
                                            value={numQuestions}
                                            onChange={setNumQuestions}
                                            className="flex-1 rounded-md"
                                        />
                                        <Button type="primary" onClick={handleCreateEmptyInputs} className="rounded-md">
                                            Tạo ô
                                        </Button>
                                    </div>
                                </Space>
                            </Card>

                            <Divider className="my-2 border-gray-100" />

                            <Card size="small" bordered={false} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                <Space direction="vertical" className="w-full">
                                    <Text type="secondary" className="text-xs">Upload file .txt (mỗi dòng 1 câu)</Text>
                                    <Upload beforeUpload={handleUploadFile} accept=".txt" showUploadList={false} className="w-full">
                                        <Button icon={<UploadOutlined />} className="w-full rounded-md" >
                                            Chọn file TXT
                                        </Button>
                                    </Upload>
                                </Space>
                            </Card>
                        </div>

                        <Divider className="m-0 border-gray-100" />

                        <div className="flex flex-col gap-2">
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={runAllTests}
                                loading={globalLoading}
                                className="w-full h-10 rounded-md shadow-md font-bold"
                            >
                                CHẠY TẤT CẢ (RUN ALL)
                            </Button>
                            <Button
                                type="primary"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => setTestItems([])}
                                className="w-full rounded-md opacity-70 hover:opacity-100"
                                disabled={globalLoading}
                            >
                                Xóa tất cả ô test
                            </Button>
                        </div>

                    </Space>
                </Sider>

                {/* 3. CONTENT: Test Arena (Hiển thị các ô input/output) */}
                <Content className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <Title level={4} className="m-0">Test Prompt</Title>
                        <Tag color="geekblue" className="rounded-full px-3">{selectedModel}</Tag>
                    </div>

                    {/* Dùng Virtual List để tối ưu performance nếu nhiều ô input */}
                    <List
                        dataSource={testItems}
                        renderItem={(item, index) => (
                            <List.Item className="p-0 border-none mb-6">
                                <Card
                                    bordered={false}
                                    className="w-full shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all group border border-gray-100"
                                    bodyStyle={{ padding: 0 }}
                                >
                                    <Row>
                                        {/* Ô INPUT CÂU HỎI (Trái) */}
                                        <Col span={11} className="p-5 border-r border-gray-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <Space>
                                                    <Tag color="blue" className="rounded-md font-mono">Test #{index + 1}</Tag>
                                                    <Text strong className="text-[10px] text-gray-500 uppercase">Câu hỏi (Prompt)</Text>
                                                </Space>
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                            <TextArea
                                                rows={6}
                                                value={item.question}
                                                onChange={(e) => handleQuestionChange(item.id, e.target.value)}
                                                placeholder="Nhập prompt tại đây..."
                                                className="bg-gray-50 border-gray-100 rounded-lg text-sm leading-relaxed"
                                            />
                                        </Col>

                                        {/* CỘT GIỮA: Nút chạy */}
                                        {/* <Col span={2} className="flex flex-col items-center justify-center bg-gray-50 border-r border-gray-100">
                                            <Button
                                                type="primary"
                                                shape="circle"
                                                icon={<SendOutlined />}
                                                loading={item.loading}
                                                onClick={() => runSingleTest(item.id)}
                                                className="shadow-lg h-12 w-12 flex items-center justify-center"
                                            />
                                        </Col> */}

                                        {/* Ô OUTPUT LLM (Phải) */}
                                        <Col span={11} className="p-5 bg-white">
                                            <div className="flex justify-between items-center mb-3 h-8">
                                                <Text strong className="text-[10px] text-gray-500 uppercase">LLM Trả lời (Answer)</Text>
                                                {item.time_executed && (
                                                    <div className="flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                                                        <Clock size={10} className="text-orange-500" />
                                                        <span className="text-[10px] font-bold text-orange-600 uppercase">Thời gian: {item.time_executed}s</span>
                                                    </div>
                                                )}
                                            </div>

                                            <Skeleton loading={item.loading} active>
                                                <div className="max-h-[220px] min-h-[140px] overflow-y-auto text-sm text-gray-700 leading-relaxed font-sans bg-[#f8fafc] p-3 rounded-lg border border-slate-100">
                                                    {item.answer ? item.answer : <Text type="secondary" italic className="text-xs">Chưa có kết quả.</Text>}
                                                </div>
                                            </Skeleton>
                                        </Col>
                                    </Row>
                                </Card>
                            </List.Item>
                        )}
                    />

                    {testItems.length === 0 && (
                        <div className="text-center py-24 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <FileTextOutlined className="text-gray-200 text-6xl mb-4" />
                            <p className="text-gray-400">Chưa có ô test nào. Hãy dùng Sidebar bên trái để tạo hoặc upload file.</p>
                        </div>
                    )}

                </Content>
            </Layout>
        </Layout>
    );
}