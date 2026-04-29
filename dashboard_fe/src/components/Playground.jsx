import React, { useEffect, useState } from 'react';
import { Layout, Card, Button, Typography, Space, Upload, InputNumber, Input, Tag, Divider, message, List, Skeleton, Row, Col, Dropdown, Select } from 'antd';
import { UploadOutlined, FileTextOutlined, SendOutlined, SettingOutlined, DeleteOutlined, UserOutlined, PlaySquareOutlined } from '@ant-design/icons';
import { Database, Play, LayoutPanelLeft, HelpCircle, Clock, PlayIcon, Tag as TagIcon } from 'lucide-react';
import { API_ENDPOINTS } from '../utils/config';

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
    const [batchsize, setBatchsize] = useState(1); // Số luồng test (1-5)
    const [userId, setUserId] = useState('user_test_01'); // User ID cho session test
    // eslint-disable-next-line no-unused-vars
    const [batchMetadata, setBatchMetadata] = useState([]); // Lưu thông tin metadata của từng batch
    const [totalExecutionTime, setTotalExecutionTime] = useState(null); // Lưu tổng thời gian xử lý thực tế

    // Xử lý gọi API thực tế cho một nhóm câu hỏi
    const processBatchAPI = async (itemsToProcess) => {
        const startTime = Date.now();
        const ids = itemsToProcess.map(item => item.id);

        // 1. Bật loading cho các item đang được xử lý
        setTestItems(prev => prev.map(item =>
            ids.includes(item.id) ? { ...item, loading: true, answer: '' } : item
        ));

        try {
            const payload = {
                "user_id": userId,
                "model_name": selectedModel,
                "batch_size": batchsize,
                "list_quest": itemsToProcess.map(item => item.question)
            };

            const response = await fetch(API_ENDPOINTS.PROCESS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();

            // LOGIC MỚI: Làm phẳng dữ liệu và lưu metadata batch
            // let allResults = [];
            // if (data.results_by_batch && Array.isArray(data.results_by_batch)) {
            //     allResults = data.results_by_batch.flatMap(batch => batch.results);
            //     // Lưu lại metadata của từng batch (thời gian chạy batch...)
            //     setBatchMetadata(data.results_by_batch);
            // } else if (Array.isArray(data)) {
            //     allResults = data;
            //     setBatchMetadata([]);
            // }

            const endTime = Date.now();
            const calcTotalTime = ((endTime - startTime) / 1000).toFixed(2);
            setTotalExecutionTime(calcTotalTime);

            // 2. CẬP NHẬT LOGIC MAPPING THEO BATCH
            console.log("Raw Response from API:", data);

            // 2. CẬP NHẬT LOGIC MAPPING THEO BATCH
            console.log("Raw Response from API:", data);

            setTestItems(prev => {
                const newItems = [...prev];
                let questionPointer = 0;

                if (data.results_by_batch && Array.isArray(data.results_by_batch)) {
                    data.results_by_batch.forEach((batchRes) => {
                        if (batchRes.results && Array.isArray(batchRes.results)) {
                            batchRes.results.forEach((resObj) => {
                                const targetItem = itemsToProcess[questionPointer];
                                if (targetItem) {
                                    const realIndex = newItems.findIndex(it => it.id === targetItem.id);
                                    if (realIndex !== -1) {
                                        newItems[realIndex] = {
                                            ...newItems[realIndex],
                                            loading: false,
                                            answer: resObj.answer || "Không có phản hồi.",
                                            time_executed: resObj.time_executed ? String(resObj.time_executed).replace('s', '') : calcTotalTime
                                        };
                                    }
                                }
                                questionPointer++;
                            });
                        }
                    });
                } else if (Array.isArray(data)) {
                    // Xử lý nếu API trả về mảng phẳng trực tiếp
                    data.forEach((resObj, idx) => {
                        const targetItem = itemsToProcess[idx];
                        if (targetItem) {
                            const realIndex = newItems.findIndex(it => it.id === targetItem.id);
                            if (realIndex !== -1) {
                                newItems[realIndex] = {
                                    ...newItems[realIndex],
                                    loading: false,
                                    answer: typeof resObj === 'string' ? resObj : (resObj.answer || "Không có phản hồi."),
                                    time_executed: resObj.time_executed ? String(resObj.time_executed).replace('s', '') : calcTotalTime
                                };
                            }
                        }
                    });
                }

                // Cuối cùng: Đảm bảo tắt loading cho tất cả các câu hỏi đã gửi đi
                const processedIds = itemsToProcess.map(it => it.id);
                return newItems.map(item =>
                    processedIds.includes(item.id) && item.loading ? { ...item, loading: false } : item
                );
            });

            return true;
        } catch (error) {
            console.error('Error processing batch:', error);
            setTestItems(prev => prev.map(item =>
                ids.includes(item.id) ? { ...item, loading: false, answer: 'Lỗi kết nối API.' } : item
            ));
            return false;
        }
    };

    useEffect(() => {
        // Tự động load một số câu hỏi mẫu nếu cần (Tùy chọn)
        // const initDefault = () => { ... };
    }, []);
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

    // // D. Xử lý gọi LLM cho TỪNG câu (Single Run)
    // const runSingleTest = async (id) => {
    //     const item = testItems.find(it => it.id === id);
    //     if (!item || !item.question) return;
    //     await processBatchAPI([item]);
    // };

    // F. Xử lý chạy TẤT CẢ các câu hỏi (Gửi một lần duy nhất)
    const runAllTests = async () => {
        const questionsToRun = testItems.filter(item => item.question.trim() !== '');
        if (questionsToRun.length === 0) {
            message.warning("Vui lòng nhập nội dung câu hỏi trước khi chạy.");
            return;
        }

        const ids = questionsToRun.map(item => item.id);
        // const startTime = Date.now();

        // 1. Bật loading cho toàn bộ các ô câu hỏi
        setGlobalLoading(true);
        setTestItems(prev => prev.map(item =>
            ids.includes(item.id) ? { ...item, loading: true, answer: '' } : item
        ));

        message.loading({ content: `Đang gửi ${questionsToRun.length} câu hỏi tới Server...`, key: 'runAll' });

        try {
            message.loading({ content: `Đang gửi ${questionsToRun.length} câu hỏi tới Server...`, key: 'runAll' });

            const results = await processBatchAPI(questionsToRun);

            if (results) {
                message.success({ content: "Đã nhận kết quả cho toàn bộ câu hỏi!", key: 'runAll', duration: 3 });
            } else {
                message.error({ content: "Không nhận được kết quả.", key: 'runAll' });
            }
        } catch (error) {
            console.error('Error processing all tests:', error);
            message.error({ content: "Lỗi kết nối Server.", key: 'runAll' });
        } finally {
            setGlobalLoading(false);
        }
    };

    // E. Xử lý xóa ô test
    const handleDeleteItem = (id) => {
        setTestItems(prev => prev.filter(item => item.id !== id));
    };

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
                                    label: 'LLM Prompt Response',
                                    icon: <Play size={16} />,
                                    disabled: true,
                                },
                                {
                                    key: 'tagging',
                                    label: 'Tagging Dataset',
                                    icon: <TagIcon size={16} />,
                                    onClick: () => onNavigate('tagging'),
                                },
                            ],
                        }}
                        trigger={['click']}
                        placement="bottomLeft"
                    >
                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-md cursor-pointer hover:bg-blue-700 transition-colors flex items-center justify-center">
                            <PlayIcon size={18} color="white" />
                        </div>
                    </Dropdown>
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-gray-400 leading-none tracking-tighter">LLM PROMPT RESPONSE</h1>
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Workspace / Prompt Response</span>
                    </div>

                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-xs font-medium">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        LLM Response Mode
                    </div>
                    <HelpCircle size={20} className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" />
                </div>
            </Header>

            <Layout>
                {/* 2. SIDER: Configuration (Phần nhập câu hỏi nằm ở đây) */}
                <Sider width={320} className="bg-[#f8fafc] p-6 border-r border-gray-100" theme="light">
                    <Space orientation="vertical" size="large" className="w-full">

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
                            <Text strong className="text-[10px] text-gray-500 uppercase tracking-widest block">User Id</Text>
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
                            <Text strong className="text-[10px] text-gray-500 uppercase tracking-widest block">Cấu hình</Text>
                            <Card size="small" variant={false} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                <Space orientation="vertical" className="w-full">
                                    <Text type="secondary" className="text-xs">Số luồng (Threads)</Text>
                                    <Select
                                        value={batchsize}
                                        onChange={setBatchsize}
                                        className="w-full rounded-md"
                                        options={[
                                            { value: 1, label: '1' },
                                            { value: 2, label: '2' },
                                            { value: 3, label: '3' },
                                            { value: 4, label: '4' },
                                            { value: 5, label: '5 (Max)' },
                                        ]}
                                    />
                                </Space>
                            </Card>

                            <Card size="small" variant={false} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                <Space orientation="vertical" className="w-full">
                                    <Text type="secondary" className="text-xs">Số câu hỏi muốn test</Text>
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

                            <Card size="small" variant={false} className="bg-white rounded-lg shadow-sm border border-gray-100">
                                <Space orientation="vertical" className="w-full">
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
                <Content className="p-8 overflow-y-auto">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <Text strong className="text-2xl text-gray-800 block">LLM Playground Arena</Text>
                            <Text type="secondary" className="text-sm">Tính thời gian gọi và trả lời</Text>
                        </div>
                        <div className="flex items-center gap-3">
                            {totalExecutionTime && (
                                <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-md border border-blue-500">
                                    <Clock size={16} />
                                    <div>
                                        <div className="text-[9px] uppercase font-bold opacity-80 leading-none">Tổng thời gian</div>
                                        <div className="text-base font-black leading-tight">{totalExecutionTime}s</div>
                                    </div>
                                </div>
                            )}
                            <Tag color="geekblue" className="rounded-full px-4 py-0.5 h-auto text-xs font-bold border-none shadow-sm">{selectedModel}</Tag>
                        </div>
                    </div>

                    {/* Batch Grouping Logic */}
                    {(() => {
                        const batches = [];
                        for (let i = 0; i < testItems.length; i += batchsize) {
                            batches.push(testItems.slice(i, i + batchsize));
                        }

                        return batches.map((batch, batchIndex) => {
                            const currentBatchMeta = batchMetadata.find(m => m.batch_no === batchIndex + 1);

                            return (
                                <div key={`batch-${batchIndex}`} className="mb-12">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-[px] flex-1 bg-gray-200"></div>
                                        <div className="flex items-center gap-2 px-4 py-1 bg-white border border-gray-100 rounded-full shadow-sm">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            <Text strong className="text-[10px] text-gray-400 uppercase tracking-widest">
                                                Batch #{batchIndex + 1} ({batch.length} câu hỏi)
                                            </Text>
                                        </div>
                                        <div className="h-[px] flex-1 bg-gray-200"></div>
                                    </div>

                                    <div className="space-y-6">
                                        {batch.map((item) => {
                                            const globalIndex = testItems.findIndex(ti => ti.id === item.id);
                                            return (
                                                <Card
                                                    key={item.id}
                                                    variant={false}
                                                    className="w-full shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all group border border-gray-100"
                                                    styles={{ padding: 0 }}
                                                >
                                                    <Row>
                                                        {/* Ô INPUT CÂU HỎI (Trái) */}
                                                        <Col span={11} className="p-5 border-r border-gray-100">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <Space>
                                                                    <Tag color="blue" className="rounded-md font-mono">Test #{globalIndex + 1}</Tag>
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

                                                        {/* Ô OUTPUT LLM (Phải) */}
                                                        <Col span={13} className="p-5 bg-white">
                                                            <div className="flex justify-between items-center mb-3 h-8">
                                                                <Text strong className="text-[10px] text-gray-500 uppercase">Respone</Text>
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
                                            );
                                        })}
                                    </div>

                                    {/* THÔNG TIN THỜI GIAN RIÊNG CỦA BATCH */}
                                    {currentBatchMeta && (
                                        <div className="mt-4 flex justify-end">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-lg shadow-sm">
                                                <Clock size={12} className="text-blue-500" />
                                                <Text className="text-[11px] text-gray-500">
                                                    Tổng thời gian: <span className="font-bold text-blue-600">{currentBatchMeta.batch_time_executed}</span>
                                                </Text>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}

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