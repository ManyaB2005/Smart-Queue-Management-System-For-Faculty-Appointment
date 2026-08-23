import React, {
    useState,
    useRef,
    useEffect
} from 'react';

import {
    ArrowLeft,
    Bot,
    Send,
    User,
    Sparkles
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import api from '../api/axios';

import ReactMarkdown from 'react-markdown';

import '../styles/SmartAssistant.css';


const SmartAssistant = () => {

    const navigate = useNavigate();


    // =====================================================
    // STATE
    // =====================================================

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content:
                "Hi! 👋 I'm your Smart Queue Assistant. I can help you check faculty availability, find your queue position, estimate waiting time, view your queue history, and more."
        }
    ]);

    const [input, setInput] = useState('');

    const [loading, setLoading] = useState(false);

    const messagesEndRef = useRef(null);


    // =====================================================
    // AUTO SCROLL
    // =====================================================

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth'
        });

    }, [messages]);


    // =====================================================
    // SEND MESSAGE
    // =====================================================

    const handleSend = async () => {

        const message = input.trim();

        if (!message || loading) {
            return;
        }


        // Add user message immediately

        setMessages((prev) => [
            ...prev,

            {
                role: 'user',
                content: message
            }
        ]);


        setInput('');

        setLoading(true);


        try {

            // =================================================
            // CALL BACKEND AI
            // =================================================

            const response = await api.post(
                '/assistant/chat',
                {
                    message
                }
            );


            const assistantResponse =
                response.data?.response ||
                'Sorry, I could not generate a response.';


            // =================================================
            // ADD AI RESPONSE
            // =================================================

            setMessages((prev) => [
                ...prev,

                {
                    role: 'assistant',
                    content: assistantResponse
                }
            ]);

        } catch (error) {

            console.error(
                'Smart Assistant error:',
                error.response?.data ||
                error.message
            );


            setMessages((prev) => [
                ...prev,

                {
                    role: 'assistant',
                    content:
                        error.response?.data?.message ||
                        'Sorry, something went wrong while contacting the Smart Assistant.'
                }
            ]);

        } finally {

            setLoading(false);

        }
    };


    // =====================================================
    // ENTER KEY
    // =====================================================

    const handleKeyDown = (e) => {

        if (
            e.key === 'Enter' &&
            !e.shiftKey
        ) {

            e.preventDefault();

            handleSend();
        }
    };


    // =====================================================
    // QUICK QUESTIONS
    // =====================================================

    const quickQuestions = [
        'Who is available right now?',
        'What is my queue position?',
        'Which faculty has the shortest wait?',
        'Show me my previous appointments.'
    ];


    const handleQuickQuestion = (question) => {

        if (loading) {
            return;
        }

        setInput(question);
    };


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="smart-assistant-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <header className="assistant-header">

                <button
                    className="assistant-back-button"
                    onClick={() =>
                        navigate('/student')
                    }
                >
                    <ArrowLeft size={18} />

                    Back to Dashboard
                </button>


                <div className="assistant-title">

                    <div className="assistant-icon">

                        <Bot size={28} />

                    </div>


                    <div>

                        <h1>
                            Smart Assistant
                        </h1>

                        <p>
                            Your AI-powered queue assistant
                        </p>

                    </div>

                </div>

            </header>


            {/* =================================================
                MAIN CHAT
            ================================================= */}

            <main className="assistant-container">

                <div className="assistant-card">


                    {/* =================================================
                        CHAT HEADER
                    ================================================= */}

                    <div className="assistant-card-header">

                        <div className="assistant-status">

                            <div className="assistant-status-icon">

                                <Sparkles size={18} />

                            </div>


                            <div>

                                <strong>
                                    Smart Queue Assistant
                                </strong>

                                <span>
                                    ● Online
                                </span>

                            </div>

                        </div>

                    </div>


                    {/* =================================================
                        MESSAGES
                    ================================================= */}

                    <div className="assistant-messages">

                        {messages.map(
                            (message, index) => (

                                <div
                                    key={index}
                                    className={`message-row ${
                                        message.role === 'user'
                                            ? 'user-message-row'
                                            : 'assistant-message-row'
                                    }`}
                                >


                                    {/* Avatar */}

                                    <div
                                        className={`message-avatar ${
                                            message.role === 'user'
                                                ? 'user-avatar'
                                                : 'bot-avatar'
                                        }`}
                                    >

                                        {message.role === 'user' ? (
                                            <User size={17} />
                                        ) : (
                                            <Bot size={17} />
                                        )}

                                    </div>


                                    {/* Message */}

                                    <div
                                        className={`message-bubble ${
                                            message.role === 'user'
                                                ? 'user-bubble'
                                                : 'assistant-bubble'
                                        }`}
                                    >

                                        {message.role === 'assistant' ? (

                                            <ReactMarkdown>
    {message.content.replace(/\\\|/g, '|')}
</ReactMarkdown>

                                        ) : (

                                            message.content

                                        )}

                                    </div>

                                </div>

                            )
                        )}


                        {/* =================================================
                            TYPING INDICATOR
                        ================================================= */}

                        {loading && (

                            <div className="message-row assistant-message-row">

                                <div className="message-avatar bot-avatar">

                                    <Bot size={17} />

                                </div>


                                <div className="message-bubble assistant-bubble typing-bubble">

                                    <span></span>

                                    <span></span>

                                    <span></span>

                                </div>

                            </div>

                        )}


                        <div ref={messagesEndRef} />

                    </div>


                    {/* =================================================
                        QUICK QUESTIONS
                    ================================================= */}

                    <div className="quick-questions">

                        <span>
                            Try asking:
                        </span>


                        <div className="quick-question-list">

                            {quickQuestions.map(
                                (question, index) => (

                                    <button
                                        key={index}
                                        onClick={() =>
                                            handleQuickQuestion(
                                                question
                                            )
                                        }
                                        disabled={loading}
                                    >
                                        {question}
                                    </button>

                                )
                            )}

                        </div>

                    </div>


                    {/* =================================================
                        INPUT
                    ================================================= */}

                    <div className="assistant-input-area">

                        <textarea
                            value={input}
                            onChange={(e) =>
                                setInput(e.target.value)
                            }
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything about your queue..."
                            rows={1}
                            disabled={loading}
                        />


                        <button
                            className="send-button"
                            onClick={handleSend}
                            disabled={
                                loading ||
                                !input.trim()
                            }
                            aria-label="Send message"
                        >

                            <Send size={19} />

                        </button>

                    </div>


                    {/* =================================================
                        DISCLAIMER
                    ================================================= */}

                    <p className="assistant-disclaimer">

                        Smart Assistant uses real-time queue
                        information to answer your questions.

                    </p>

                </div>

            </main>

        </div>
    );
};


export default SmartAssistant;