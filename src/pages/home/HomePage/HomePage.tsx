import { Link } from "react-router-dom";

import "./HomePage.css";

function HomePage() {
    // TODO: AI Server 상태 API 연동 후 실제 상태로 교체
    const isAiServerOnline = false;

    return (
        <div className="home-page">
            <section className="home-hero">
                <div className="home-hero-text">
                    <div className="home-status-row">
                        <span className="home-status">
                            현재 개발 및 테스트 중인 서비스입니다.
                        </span>

                        <span
                            className={
                                isAiServerOnline
                                    ? "home-ai-status online"
                                    : "home-ai-status offline"
                            }>
                            <span className="home-ai-status-dot" />
                            AI Server {isAiServerOnline ? "Online" : "Offline"}
                        </span>
                    </div>

                    <h1>
                        바둑 문제를 풀고,
                        <br />
                        AI와 함께 분석하고 대국해보세요.
                    </h1>

                    <p>
                        SolveGO는 사용자가 직접 바둑 문제를 만들고 풀며, AI
                        분석과 대국을 경험할 수 있는 서비스입니다.
                    </p>

                    {!isAiServerOnline && (
                        <p className="home-ai-offline-message">
                            현재 AI 서버가 중지되어 있어 AI 분석 및 대국 기능을
                            사용할 수 없습니다.
                        </p>
                    )}

                    <div className="home-hero-buttons">
                        <Link to="/problems" className="home-primary-button">
                            문제 풀기
                        </Link>

                        <Link to="/ai-play" className="home-secondary-button">
                            AI 대국 시작
                        </Link>
                    </div>
                </div>
            </section>

            <section className="home-section">
                <h2>주요 기능</h2>

                <div className="home-feature-grid">
                    <div className="home-feature-card">
                        <h3>문제 풀이</h3>

                        <p>
                            다른 사용자가 만든 바둑 문제를 풀고 정답 여부를
                            확인할 수 있습니다.
                        </p>
                    </div>

                    <div className="home-feature-card">
                        <h3>AI 분석</h3>

                        <p>
                            문제 풀이 후 KataGo를 이용해 자신의 착수와 승률을
                            분석할 수 있습니다.
                        </p>
                    </div>

                    <div className="home-feature-card">
                        <h3>AI 대국</h3>

                        <p>
                            흑 또는 백을 선택해 KataGo와 직접 대국을 진행할 수
                            있습니다.
                        </p>
                    </div>

                    <div className="home-feature-card">
                        <h3>문제 만들기</h3>

                        <p>
                            직접 바둑판을 구성하고 정답 위치를 지정해 새로운
                            문제를 등록할 수 있습니다.
                        </p>
                    </div>
                </div>
            </section>

            <section className="home-section home-about">
                <h2>About SolveGO</h2>

                <p>
                    SolveGO는 바둑 문제 풀이와 AI 기능을 결합해 직접 설계하고
                    개발하고 있는 개인 프로젝트입니다.
                </p>

                <div className="home-developer">
                    <span>Developer</span>
                    <strong>김동환</strong>
                </div>
            </section>
        </div>
    );
}

export default HomePage;
