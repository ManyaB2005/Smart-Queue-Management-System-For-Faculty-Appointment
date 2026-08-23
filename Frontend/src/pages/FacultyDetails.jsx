import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Users, BookOpen } from 'lucide-react';
import '../styles/FacultyDetails.css';

const FacultyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState({
    faculty: null,
    count: 0,
    loading: true
  });

  const [activeQueue, setActiveQueue] = useState(null);
  const [showPurpose, setShowPurpose] = useState(false);
const [appointmentType, setAppointmentType] = useState('');


  // =====================================================
  // FETCH FACULTY + QUEUE INFORMATION
  // =====================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');

        // If no token, go back to login
        if (!token) {
          navigate('/login');
          return;
        }

        const [fRes, cRes, statusRes] = await Promise.all([
          api.get(`/queue/faculties/${id}`),
          api.get(`/queue/faculty-queue-count/${id}`),
          api.get('/queue/check-status')
        ]);

        // Faculty information + queue count
        setData({
          faculty: fRes.data,
          count: Number(cRes.data.count),
          loading: false
        });


        // =================================================
        // CHECK WHETHER STUDENT ALREADY HAS A QUEUE
        // =================================================

        const existingQueue = statusRes.data.activeQueue;

        if (existingQueue) {

          // -------------------------------------------------
          // Student is already waiting for THIS faculty
          // -------------------------------------------------

          if (
            String(existingQueue.faculty_id) === String(id)
          ) {

            const calculatedWait =
  existingQueue.estimatedWait !== undefined &&
  existingQueue.estimatedWait !== null
    ? Number(existingQueue.estimatedWait)
    : 0;


            setActiveQueue({
              isHere: true,

              queueId: existingQueue.id,

              tokenNumber: existingQueue.token_number,

              estimatedWait: calculatedWait,

              position: Number(existingQueue.position)
            });

          }

          // -------------------------------------------------
          // Student is waiting for ANOTHER faculty
          // -------------------------------------------------

          else {

            setActiveQueue({
              isHere: false,

              facultyName: existingQueue.facultyName
            });
          }

        } else {

          // Student is not in any queue
          setActiveQueue(null);
        }

      } catch (error) {

        console.error(
          'Error loading faculty details:',
          error
        );

        setData({
          faculty: null,
          count: 0,
          loading: false
        });
      }
    };


    fetchData();

  }, [id, navigate]);


  // =====================================================
  // JOIN QUEUE
  // =====================================================

  const handleJoinQueue = async () => {

  // First show purpose selection
  if (!appointmentType) {
    setShowPurpose(true);
    return;
  }

  try {

    const res = await api.post(
      '/queue/join',
      {
        facultyId: id,
        appointmentType: appointmentType
      }
    );


    const newPosition =
  data.count + 1;

const estimatedWaitTime =
  Number(
    res.data.data.estimatedWait
  ) || 0;


    setActiveQueue({
      isHere: true,

      queueId:
        res.data.data.queueId,

      tokenNumber:
        res.data.data.tokenNumber,

      estimatedWait:
        estimatedWaitTime,

      position:
        newPosition
    });


    // Increase displayed queue count

    setData(prev => ({
      ...prev,
      count:
        prev.count + 1
    }));


    setShowPurpose(false);

  } catch (error) {

    console.error(
      'Join queue error:',
      error
    );

    alert(
      'Error: ' +
      (
        error.response?.data?.message ||
        'Unable to join queue.'
      )
    );
  }
};


  // =====================================================
  // LEAVE / CANCEL QUEUE
  // =====================================================

 const handleCancelQueue = async () => {
  try {
    if (!activeQueue?.queueId) {
      return;
    }

    const response = await api.delete(
      `/queue/leave/${activeQueue.queueId}`
    );

    console.log(
      'QUEUE CANCEL SUCCESS:',
      response.data
    );

    setActiveQueue(null);

    setData(prev => ({
      ...prev,
      count: Math.max(0, prev.count - 1)
    }));

  } catch (error) {
    console.error(
      'QUEUE CANCEL FAILED:',
      error.response?.status,
      error.response?.data || error.message
    );

    alert(
      error.response?.data?.message ||
      'Failed to cancel queue.'
    );
  }
};


  // =====================================================
  // LOADING
  // =====================================================

  if (data.loading) {

    return (
      <div className="modern-details-page">
        <h2>Loading interface...</h2>
      </div>
    );
  }


  // =====================================================
  // FACULTY INITIALS
  // =====================================================

  const initials = data.faculty?.name
    ? data.faculty.name
        .substring(0, 2)
        .toUpperCase()
    : 'PR';


  // =====================================================
  // QUEUE DISPLAY DATA
  // =====================================================

  const isMyQueue =
    activeQueue &&
    activeQueue.isHere;


  const displayCount = isMyQueue
    ? Math.max(0, data.count - 1)
    : data.count;


  const waitText = isMyQueue
    ? 'ahead of you'
    : 'students waiting';


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="modern-details-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">

        <button
          className="nav-back-btn"
          onClick={() => navigate('/student')}
        >
          <ArrowLeft size={18} />

          <span>
            Back to Portal
          </span>

        </button>

      </div>


      {/* =================================================
          MAIN PANEL
      ================================================= */}

      <div className="integrated-panel">


        {/* =================================================
            FACULTY PROFILE
        ================================================= */}

        <div className="faculty-profile-section">

          <div className="avatar-large">
            {initials}
          </div>


          <div className="profile-text">

            <h1>
              {data.faculty?.name}
            </h1>


            <div className="meta-tags">

              <span className="tag">

                <BookOpen size={14} />

                Engineering

              </span>

            </div>


            <div className="live-status-pill">

              <Users size={16} />

              <strong>
                {displayCount}
              </strong>

              {waitText}

            </div>

          </div>

        </div>


        {/* =================================================
            ACTION SECTION
        ================================================= */}

        <div className="action-section">


          {/* =================================================
              STUDENT HAS A QUEUE
          ================================================= */}

          {activeQueue ? (

            activeQueue.isHere ? (

              <div className="modern-token-card">

                <div className="token-header">
                  Your Digital Token
                </div>


                <div className="token-id">
                  {activeQueue.tokenNumber}
                </div>


                <div className="metrics-row">


                  {/* POSITION */}

                  <div className="metric">

                    <span className="metric-label">
                      Position
                    </span>

                    <span className="metric-value">
                      #{activeQueue.position}
                    </span>

                  </div>


                  <div className="metric divider"></div>


                  {/* ESTIMATED WAIT */}

                  <div className="metric">

                    <span className="metric-label">
                      Est. Wait
                    </span>

                    <span className="metric-value">
                      {Number(activeQueue.estimatedWait) === 0
  ? 'No wait'
  : `~${(
      Number(activeQueue.estimatedWait) / 60
    ).toFixed(1)} min`
}

                    </span>

                  </div>

                </div>


                {/* CANCEL */}

                <button
                  className="btn-cancel"
                  onClick={handleCancelQueue}
                >
                  Cancel Appointment
                </button>

              </div>

            ) : (

              /* =================================================
                 QUEUE ACTIVE FOR ANOTHER FACULTY
              ================================================= */

              <div className="join-prompt-card">

                <h3>
                  Queue Active Elsewhere
                </h3>


                <p>

                  You are currently waiting in the
                  queue for{' '}

                  <strong>
                    {activeQueue.facultyName}
                  </strong>.

                  {' '}You must cancel that appointment
                  before joining a new one.

                </p>


                <button
                  className="btn-primary-large"
                  style={{
                    background: '#cbd5e1',
                    cursor: 'not-allowed'
                  }}
                  disabled
                >
                  Already in a Queue
                </button>

              </div>
            )

          ) : (

            /* =================================================
               NO ACTIVE QUEUE
            ================================================= */

            <div className="join-prompt-card">

              <h3>
                Queue Status: Open
              </h3>


              <p>

                Reserve your spot to meet with{' '}

                {data.faculty?.name}.

              </p>


              {showPurpose ? (

  <div>

    <h3>
      What is the purpose of your visit?
    </h3>

    <p>
      Please select why you want to meet{' '}
      {data.faculty?.name}.
    </p>


    <select
      value={appointmentType}
      onChange={(e) =>
        setAppointmentType(
          e.target.value
        )
      }
      style={{
        width: '100%',
        padding: '12px',
        marginBottom: '15px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '15px'
      }}
    >

      <option value="">
        Select purpose
      </option>

      <option value="SIGNATURE">
        Signature
      </option>

      <option value="PROJECT">
        Project Discussion
      </option>

      <option value="EXAM_QUERY">
        Exam / Syllabus Query
      </option>

      <option value="GENERAL_DOUBT">
        General Doubt
      </option>

      <option value="DOCUMENT">
        Document Work
      </option>

      <option value="OTHER">
        Other
      </option>

    </select>


    <button
      className="btn-primary-large"
      onClick={handleJoinQueue}
      disabled={!appointmentType}
    >
      Confirm & Join Queue
    </button>

  </div>

) : (

  <button
    className="btn-primary-large"
    onClick={handleJoinQueue}
  >
    Join Queue Now
  </button>

)}

            </div>

          )}

        </div>

      </div>

    </div>
  );
};


export default FacultyDetails;