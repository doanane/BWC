import { useNavigate } from 'react-router-dom';
import './BackIcon.css';

export default function BackIcon() {
    const navigate = useNavigate();

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            navigate(-1);
            return;
        }
        navigate('/dashboard', { replace: true });
    };

    return (
        <button
            type="button"
            className="back-icon-btn"
            onClick={handleBack}
            aria-label="Go back"
            title="Go back"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
        </button>
    );
}
