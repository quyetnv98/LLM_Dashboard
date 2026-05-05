import React from 'react';
import { Card, Tag, Button, Divider, Row, Col, Typography } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Markdown from 'react-markdown';

const { Title, Text } = Typography;

const CompareRespone = ({ data, onNavigate }) => {
    if (!data || data.length < 2) {
        return (
            <div className="p-8 text-center">
                <Title level={4}>Vui lòng chọn 2 câu hỏi để so sánh</Title>
                <Button type="primary" onClick={() => onNavigate('dashboard')}>Quay lại Dashboard</Button>
            </div>
        );
    }

    const [item1, item2] = data;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => onNavigate('dashboard')}
                        className="hover:text-blue-600"
                    >
                        Quay lại
                    </Button>
                    <Title level={3} style={{ margin: 0 }}>So sánh kết quả LLM</Title>
                </div>
                <Tag color="blue" className="px-3 py-1 text-sm rounded-full">
                    Comparing 2 Responses
                </Tag>
            </div>

            {/* Question Info */}
            <Card className="mb-6 shadow-sm border-0 rounded-xl overflow-hidden">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <UserOutlined className="text-blue-600 text-xl" />
                    </div>
                    <div>
                        <Text type="secondary" className="text-xs uppercase font-bold tracking-wider">Câu hỏi: </Text>
                        <Title level={4} className="mt-1">{item1.question}</Title>
                    </div>
                </div>
            </Card>

            {/* Comparison Columns */}
            <Row gutter={24}>
                {[item1, item2].map((item, index) => (
                    <Col span={12} key={item.session_id}>
                        <Card
                            className="shadow-md border-0 rounded-xl h-full"
                            title={
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2">
                                        <RobotOutlined className="text-blue-500" />
                                        <Text font-bold>Respone: {index + 1}</Text>
                                    </div>
                                    <Tag color="blue" className="m-0">{item.model_name}</Tag>
                                </div>
                            }
                        >
                            <div className="mb-4 flex items-center gap-4 text-xs text-gray-500">
                                <span><ClockCircleOutlined /> {item.time_executed}</span>
                                <span>ID: {item.session_id}</span>
                            </div>

                            <Divider className="my-4" />

                            <div className="prose max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100 min-h-[400px]">
                                <Markdown
                                    components={{
                                        a: ({...props }) => (
                                            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />
                                        )
                                    }}
                                >{item.answer}</Markdown>
                            </div>

                            {item.note && (
                                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 italic text-amber-700 text-sm">
                                    <strong>Ghi chú:</strong> {item.note}
                                </div>
                            )}
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default CompareRespone;