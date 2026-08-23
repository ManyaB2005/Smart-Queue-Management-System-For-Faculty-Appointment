import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Mail,
  AlertCircle,
  Search,
  BookOpen
} from 'lucide-react';

import '../styles/HelpSupport.css';

const HelpSupport = () => {

  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      question: 'How do I join a faculty queue?',
      answer:
        'Open the Student Dashboard, select an available faculty member, choose your appointment type, and confirm your request.'
    },
    {
      question: 'How can I see my queue position?',
      answer:
        'You can see your current token, queue position, people ahead of you, and estimated waiting time from your Active Queue page.'
    },
    {
      question: 'Can I cancel my queue request?',
      answer:
        'Yes. Open your Active Queue page and select the cancel option for your current appointment.'
    },
    {
      question: 'How will I know when it is my turn?',
      answer:
        'The application provides real-time queue updates and notifications when your appointment is approaching or your turn begins.'
    },
    {
      question: 'What happens if a faculty member is busy?',
      answer:
        'You can still view the faculty member, but joining may be restricted until the faculty member becomes available.'
    },
    {
      question: 'Who should I contact if something is not working?',
      answer:
        'Use the support options below to report the issue or contact the application administrator.'
    }
  ];

  const filteredFaqs = faqs.filter((faq) =>
    faq.question
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="help-page">

      {/* Header */}

      <div className="help-header">

        <button
          className="help-back-btn"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="help-title">

          <div className="help-title-icon">
            <HelpCircle size={27} />
          </div>

          <div>
            <h1>Help & Support</h1>

            <p>
              Find answers and get help with Smart Queue.
            </p>
          </div>

        </div>

      </div>


      <div className="help-container">

        {/* Search */}

        <section className="help-search-card">

          <div className="help-search-icon">
            <Search size={20} />
          </div>

          <div>
            <h2>How can we help?</h2>

            <p>
              Search our frequently asked questions.
            </p>
          </div>

          <div className="help-search-box">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search for help..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

          </div>

        </section>


        {/* FAQ */}

        <section className="faq-section">

          <div className="section-heading">

            <div>
              <h2>Frequently Asked Questions</h2>

              <p>
                Quick answers to common questions.
              </p>
            </div>

            <BookOpen size={21} />

          </div>


          <div className="faq-list">

            {filteredFaqs.length > 0 ? (

              filteredFaqs.map((faq, index) => {

                const isOpen = openFaq === index;

                return (
                  <div
                    key={index}
                    className={`faq-item ${
                      isOpen ? 'faq-open' : ''
                    }`}
                  >

                    <button
                      className="faq-question"
                      onClick={() =>
                        setOpenFaq(
                          isOpen ? null : index
                        )
                      }
                    >

                      <span>
                        {faq.question}
                      </span>

                      <ChevronDown
                        size={19}
                        className={
                          isOpen
                            ? 'faq-arrow-open'
                            : ''
                        }
                      />

                    </button>

                    {isOpen && (
                      <div className="faq-answer">
                        {faq.answer}
                      </div>
                    )}

                  </div>
                );
              })

            ) : (

              <div className="faq-no-results">
                <Search size={25} />

                <p>
                  No matching questions found.
                </p>
              </div>

            )}

          </div>

        </section>


        {/* Support Cards */}

        <section className="support-section">

          <div className="section-heading">

            <div>
              <h2>Still need help?</h2>

              <p>
                Our support options are here for you.
              </p>
            </div>

          </div>


          <div className="support-grid">

            <div className="support-card">

              <div className="support-card-icon blue">
                <MessageCircle size={21} />
              </div>

              <div>

                <h3>Report a Problem</h3>

                <p>
                  Something isn't working correctly?
                  Let the administrator know.
                </p>

                <button
                  onClick={() =>
                    alert(
                      'Please contact your administrator to report a problem.'
                    )
                  }
                >
                  Report Issue
                </button>

              </div>

            </div>


            <div className="support-card">

              <div className="support-card-icon purple">
                <Mail size={21} />
              </div>

              <div>

                <h3>Contact Support</h3>

                <p>
                  Need assistance with your account
                  or appointment?
                </p>

                <button
                  onClick={() =>
                    window.location.href =
                      'mailto:support@smartqueue.com'
                  }
                >
                  Email Support
                </button>

              </div>

            </div>


            <div className="support-card">

              <div className="support-card-icon orange">
                <AlertCircle size={21} />
              </div>

              <div>

                <h3>Queue Assistance</h3>

                <p>
                  Get help with joining, cancelling,
                  or tracking your queue.
                </p>

                <button
                  onClick={() =>
                    setSearch('queue')
                  }
                >
                  View Queue Help
                </button>

              </div>

            </div>

          </div>

        </section>

      </div>

    </div>
  );
};

export default HelpSupport;