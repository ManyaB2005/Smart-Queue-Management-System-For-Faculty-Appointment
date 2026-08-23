import React from 'react';
import { Check, User } from 'lucide-react';

const QueueProgress = ({ position, status }) => {
  const safePosition = Math.max(1, Number(position) || 1);

  if (status === 'active') {
    return (
      <div className="queue-progress">
        <div className="progress-title">
          Your turn
        </div>

        <div className="progress-line active">
          <div className="progress-dot">
            <Check size={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-progress">

      <div className="progress-title">
        Your Queue Progress
      </div>

      <div className="progress-track">

        {Array.from(
          { length: safePosition },
          (_, index) => {
            const isYou =
              index === safePosition - 1;

            return (
              <div
                key={index}
                className={`progress-person ${
                  isYou ? 'you' : 'ahead'
                }`}
              >
                <div className="progress-dot">
                  {isYou ? (
                    <User size={16} />
                  ) : (
                    <span>
                      {index + 1}
                    </span>
                  )}
                </div>

                <span>
                  {isYou
                    ? 'You'
                    : `Student ${index + 1}`}
                </span>
              </div>
            );
          }
        )}

      </div>

    </div>
  );
};

export default QueueProgress;