import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { API_BASE_URL } from "../../../api/api";

import "./HomePage.css";

type AiStatus = "ONLINE" | "OFFLINE";

function HomePage() {
    const [aiStatus, setAiStatus] = useState<AiStatus>("OFFLINE");

    useEffect(() => {
        const fetchAiStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/ai/status`);

                if (!response.ok) {
                    setAiStatus("OFFLINE");
                    return;
                }

                const data: { status: AiStatus } = await response.json();

                setAiStatus(data.status);
            } catch {
                setAiStatus("OFFLINE");
            }
        };

        fetchAiStatus();
    }, []);

    const isAiServerOnline = aiStatus === "ONLINE";

    return (
        <div className="home-page">
            <section className="home-hero">
                <div className="home-hero-content">
                    <div className="home-hero-text">
                        <h1>
                            바둑 문제를 풀고,
                            <br />
                            AI와 함께 분석하고 대국해보세요.
                        </h1>

                        <p>
                            SolveGO는 사용자가 직접 바둑 문제를 만들고 풀며, AI
                            분석과 대국을 경험할 수 있는 서비스입니다.
                        </p>

                        <div className="home-hero-actions">
                            <Link
                                to="/problems"
                                className="home-primary-button">
                                문제 풀기
                            </Link>

                            <Link
                                to="/ai-play"
                                className="home-secondary-button">
                                AI 대국 시작
                            </Link>

                            <div className="home-ai-status-wrapper">
                                <span className="home-ai-status-divider" />

                                <span
                                    className={
                                        isAiServerOnline
                                            ? "home-ai-status online"
                                            : "home-ai-status offline"
                                    }>
                                    <span className="home-ai-status-dot" />
                                    AI Server{" "}
                                    {isAiServerOnline ? "Online" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default HomePage;
