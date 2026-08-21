import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  SendIcon,
  ArrowLeftIcon,
  Loader2,
  MessageCircleIcon,
  TrendingUpIcon,
  Award,
  Target,
  AlertCircle,
  CheckCircle2,
  Brain,
  Mic,
  StopCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../configs/api';

const DebatePage = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);

  // States
  const [phase, setPhase] = useState('topic'); // topic, debating, feedback
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [debateFeedback, setDebateFeedback] = useState(null);
  const [round, setRound] = useState(0);
  const [topics, setTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Fetch suggested topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await api.get('/api/debate/topics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTopics(res.data.topics);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setTopicsLoading(false);
      }
    };

    if (token) {
      fetchTopics();
    }
  }, [token]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.language = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setUserInput((prev) => prev + transcript + ' ');
        } else {
          interim += transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error !== 'no-speech') {
        toast.error(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Toggle microphone
  const toggleMicrophone = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
    }
  };

  // Start debate
  const handleStartDebate = async () => {
    const topic = customTopic.trim() || selectedTopic;

    if (!topic) {
      toast.error('Please select or enter a topic');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(
        '/api/debate/start',
        { topic },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const debate = res.data.debate;
      setMessages([
        {
          id: 1,
          sender: 'panel',
          text: debate,
          timestamp: new Date()
        }
      ]);
      setPhase('debating');
      setRound(1);
      setSelectedTopic(topic);
    } catch (error) {
      console.error('Error starting debate:', error);
      toast.error('Failed to start debate');
    } finally {
      setLoading(false);
    }
  };

  // Send argument
  const handleSendArgument = async () => {
    if (!userInput.trim()) {
      toast.error('Write your argument first');
      return;
    }

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: userInput,
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages([...messages, userMessage]);
    setUserInput('');
    setLoading(true);

    try {
      const res = await api.post(
        '/api/debate/respond',
        {
          userArgument: userInput,
          topic: selectedTopic,
          round
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const panelResponse = {
        id: messages.length + 2,
        sender: 'panel',
        text: res.data.responses,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, panelResponse]);
      setRound(res.data.round);
    } catch (error) {
      console.error('Error sending argument:', error);
      toast.error('Failed to get panel response');
    } finally {
      setLoading(false);
    }
  };

  // End debate and get feedback
  const handleEndDebate = async () => {
    setLoading(true);
    try {
      const res = await api.post(
        '/api/debate/feedback',
        {
          topic: selectedTopic,
          messages
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDebateFeedback(res.data.feedback);
      setPhase('feedback');
    } catch (error) {
      console.error('Error getting feedback:', error);
      toast.error('Failed to generate feedback');
    } finally {
      setLoading(false);
    }
  };

  // ============ PHASE 1: TOPIC SELECTION ============
  if (phase === 'topic') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-white hover:text-purple-200 transition"
            >
              <ArrowLeftIcon size={24} />
              <span>Back</span>
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Brain size={32} />
              Debate Mode
            </h1>
            <div className="w-16"></div>
          </div>

          {/* Hero Section */}
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">
              🧠 Engage in AI Debate
            </h2>
            <p className="text-white/80 mb-4">
              Challenge yourself in a 3-person panel debate. A supporter will back you, an opponent will challenge you, and a neutral judge will evaluate your arguments. Develop critical thinking and argumentation skills.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🟢</div>
                <p className="text-white/70 text-sm">Supporter backs your stance</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔴</div>
                <p className="text-white/70 text-sm">Opponent challenges you</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🟡</div>
                <p className="text-white/70 text-sm">Judge provides feedback</p>
              </div>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="bg-white rounded-xl p-8">
            <h3 className="text-xl font-bold mb-6">Choose a Debate Topic</h3>

            {/* Suggested Topics */}
            {topicsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-purple-600" size={32} />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-3 font-semibold">Suggested Topics:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {topics.map((topic, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedTopic(topic);
                          setCustomTopic('');
                        }}
                        className={`p-3 rounded-lg text-left transition-all border-2 ${
                          selectedTopic === topic
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <p className="font-medium text-gray-800">{topic}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Or Custom Topic */}
                <div className="border-t pt-6">
                  <p className="text-gray-600 text-sm mb-3 font-semibold">Or Enter Your Own Topic:</p>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => {
                      setCustomTopic(e.target.value);
                      setSelectedTopic('');
                    }}
                    placeholder="Enter any topic you'd like to debate..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none mb-4"
                  />
                  <p className="text-gray-500 text-xs mb-4">
                    The more specific your topic, the more focused the debate.
                  </p>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartDebate}
                  disabled={loading || !selectedTopic && !customTopic}
                  className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    loading || (!selectedTopic && !customTopic)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Starting Debate...
                    </>
                  ) : (
                    <>
                      <MessageCircleIcon size={20} />
                      Start Debate
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ PHASE 2: DEBATING ============
  if (phase === 'debating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <ArrowLeftIcon size={20} />
            Back
          </button>
          <div className="text-center flex-1">
            <h2 className="font-bold">{selectedTopic}</h2>
            <p className="text-sm text-white/70">Round {round}</p>
          </div>
          <button
            onClick={handleEndDebate}
            disabled={loading}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition"
          >
            End Debate
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-6 py-4 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-700 text-white rounded-bl-none border border-gray-600'
                }`}
              >
                {msg.sender === 'user' ? (
                  <>
                    <p className="font-semibold text-blue-100 mb-1">You</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-yellow-300 mb-2">Panel Response</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </>
                )}
                <p className="text-xs opacity-60 mt-2">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin text-purple-400" size={24} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-gray-800 border-t border-gray-700 p-6">
          <div className="max-w-4xl mx-auto">
            {isRecording && (
              <div className="mb-3 flex items-center gap-2 text-red-400 text-sm animate-pulse">
                <StopCircle size={16} className="animate-pulse" />
                Recording... Speak now
              </div>
            )}
            <div className="flex gap-3">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendArgument();
                  }
                }}
                placeholder="Enter your argument or counterpoint..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none disabled:opacity-50 resize-none"
                rows="3"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={toggleMicrophone}
                  disabled={loading}
                  className={`px-4 py-3 rounded-lg font-bold flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : loading
                      ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg text-white'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? (
                    <StopCircle size={20} />
                  ) : (
                    <Mic size={20} />
                  )}
                </button>
                <button
                  onClick={handleSendArgument}
                  disabled={loading || !userInput.trim()}
                  className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    loading || !userInput.trim()
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg text-white'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <SendIcon size={20} />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-2">
              💡 Tip: Make clear, logical arguments. The panel will challenge your reasoning.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============ PHASE 3: FEEDBACK ============
  if (phase === 'feedback' && debateFeedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeftIcon size={24} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Debate Feedback</h1>
            <div className="w-24"></div>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-8 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-lg mb-2">Overall Debate Performance</p>
                <h2 className="text-5xl font-bold">{debateFeedback.overall_score}/10</h2>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <Award size={48} />
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Arguments', score: debateFeedback.argument_quality },
              { label: 'Critical Thinking', score: debateFeedback.critical_thinking },
              { label: 'Responsiveness', score: debateFeedback.responsiveness },
              { label: 'Communication', score: debateFeedback.communication }
            ].map((metric, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-gray-600 text-sm font-semibold mb-2">{metric.label}</p>
                <div className="text-3xl font-bold text-purple-600">{metric.score}/10</div>
                <div className="w-full bg-gray-200 h-2 rounded-full mt-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full"
                    style={{ width: `${(metric.score / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Strengths */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
              <CheckCircle2 className="text-green-600" size={24} />
              Key Strengths
            </h3>
            <ul className="space-y-2">
              {debateFeedback.strengths?.map((strength, idx) => (
                <li key={idx} className="flex gap-2 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4">
              <AlertCircle className="text-amber-600" size={24} />
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {debateFeedback.areas_for_improvement?.map((area, idx) => (
                <li key={idx} className="flex gap-2 text-gray-700">
                  <span className="text-amber-600 font-bold">→</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Insights */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-6">
            <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2 mb-3">
              <Brain size={24} className="text-blue-600" />
              Key Insights
            </h3>
            <p className="text-blue-800">{debateFeedback.key_insights}</p>
          </div>

          {/* Coach Feedback */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 mb-6">
            <h3 className="font-bold text-lg text-purple-900 mb-3">Coach Feedback</h3>
            <p className="text-purple-800 leading-relaxed">{debateFeedback.coach_feedback}</p>
          </div>

          {/* Debate Summary */}
          <div className="bg-gray-700 text-white rounded-xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-3">Debate Summary</h3>
            <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
              {debateFeedback.debate_summary}
            </p>
          </div>

          {/* Topic Reminder */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
            <p className="text-gray-600">
              <span className="font-semibold">Debate Topic:</span> {selectedTopic}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setPhase('topic');
                setMessages([]);
                setUserInput('');
                setSelectedTopic('');
                setCustomTopic('');
                setDebateFeedback(null);
                setRound(0);
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg transition"
            >
              Try Another Topic
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg font-bold hover:bg-gray-400 transition"
            >
              Return to Resume Builder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DebatePage;
