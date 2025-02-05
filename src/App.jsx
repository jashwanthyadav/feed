// External dependencies
import React, { useContext, useState, useEffect, useRef } from "react";
import reactToWebComponent from "react-to-webcomponent";
import ReactDOM from "react-dom";
import { 
  Video, Users, MessageCircle, AlertCircle, 
  Menu, Maximize, Minimize 
} from "lucide-react";

// Components
import VideoPlayer from "./VideoPlayer/VideoPlayer";
import Popup from "./components/Popup/Popup";
import MemberSense from "./components/MemberSenseComponents/MemberSenseLogin/MemberSense";
import MemberShowcase from "./components/MemberSenseComponents/MemberShowcase/MemberShowcase";
import DiscordChannelViewer from "./components/MemberSenseComponents/DiscordChannelViewer/DiscordChannelViewer";

// Context
import { Context } from "./Context/Context";
import ContextProvider from "./Context/ContextGoogle";

// Services
import {
  fetchMembers,
  fetchChannels,
  fetchMessages,
  fetchFakeMembers,
  fetchFakeChannels,
  fetchFakeMessages
} from "./services/Dataservice";

// Styles
import "./App.scss";

// Constants
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Web Component Registration
const VideoPlayerComponent = reactToWebComponent(VideoPlayer, React, ReactDOM);
customElements.define("video-player-widget", VideoPlayerComponent);

function App() {
  // Navigation state
  const [currentView, setCurrentView] = useState("FeedPlayer");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const appRef = useRef(null);

  // Feed player state
  const [isPopup, setIsPopup] = useState(false);
  const { setVideoList, setCurrentVideoSrc } = useContext(Context);

  // Auth state
  const [token, setToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  
  // Data state
  const [useMockData, setUseMockData] = useState(true);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);

  // Navigation items configuration
  const memberSenseDropdownItems = [
    { id: "Showcase", icon: Users, label: "Member Showcase" },
    { id: "DiscordViewer", icon: MessageCircle, label: "Discord Viewer" },
  ];

  // Effects
  useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      if (useMockData) {
        const fakeMembers = fetchFakeMembers();
        const fakeChannels = fetchFakeChannels();
        setMembers(fakeMembers);
        setChannels(fakeChannels);
        if (fakeChannels.length > 0 && !selectedChannel) {
          setSelectedChannel(fakeChannels[0].id);
        }
      } else {
        Promise.all([
          fetchMembers(sessionId),
          fetchChannels(sessionId)
        ])
          .then(([membersData, channelsData]) => {
            setMembers(membersData);
            setChannels(channelsData);
            console.log("Fetching Channel Data.")
            console.log(channelsData.length);
            if (channelsData.length > 0 && !selectedChannel) {
              setSelectedChannel(channelsData[0].id);
            }
          })
          .catch(error => {
            console.error('Error fetching data:', error);
            setError('Failed to fetch data. Please try again.');
          })
          .finally(() => setIsLoading(false));
      }
    } else {
      setMembers([]);
      setChannels([]);
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId && selectedChannel) {
      setIsLoading(true);
      if (useMockData) {
        const fakeMessages = fetchFakeMessages(selectedChannel);
        setMessages(fakeMessages);
        setIsLoading(false);
      } else {
        fetchMessages(sessionId, selectedChannel)
          .then(messagesData => {
            setMessages(messagesData);
          })
          .catch(error => {
            console.error('Error fetching messages:', error);
            setError('Failed to fetch messages. Please try again.');
          })
          .finally(() => setIsLoading(false));
      }
    }
  }, [sessionId, selectedChannel]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
      if (!isFullScreen) setIsMenuOpen(false);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Event handlers
  const handleLogin = async (inputToken) => {
    setIsLoading(true);
    setError("");
    
    if (useMockData) {
      setToken("MockTokenPlaceHolder");
      setSessionId("12345-abcdef-67890");
      setIsLoggedIn(true);
      setServerInfo({
        serverName: "Mocking Discord Server",
        memberCount: 1500,
        iconURL: "https://via.placeholder.com/48",
      });
      setIsLoading(false);
      return true;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inputToken }),
      });
      
      if (!response.ok) throw new Error("Login failed");
      
      const data = await response.json();
      setToken(inputToken);
      setSessionId(data.sessionId);
      setServerInfo({
        serverName: data.serverName,
        memberCount: data.memberCount,
        iconURL: data.iconURL,
      });
      return true;
    } catch (error) {
      console.error("Login error:", error);
      setError("Login failed. Please check your token and try again.");
      setToken("");
      setSessionId("");
      setServerInfo(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (useMockData) {
      setIsLoggingOut(true);
      setIsTransitioning(true);
      setIsLoading(true);
      setTimeout(() => {
        setToken("");
        setSessionId("");
        setServerInfo(null);
        setCurrentView("MemberSense");
        setIsLoggedIn(false);
        setIsLoggingOut(false);
        setIsLoading(false);
        setIsTransitioning(false);
      }, 300);
      return;
    }

    setIsLoggingOut(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': sessionId }
      });
      if (!response.ok) throw new Error('Logout failed');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setTimeout(() => {
        setToken('');
        setSessionId('');
        setServerInfo(null);
        setCurrentView('MemberSense');
        setIsLoggingOut(false);
      }, 300);
    }
  };

  const handleViewChange = (view) => {
    setError("");
    setIsTransitioning(true);
    setIsLoading(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsTransitioning(false);
      setTimeout(() => setIsLoading(false), 500);
    }, 300);
  };

  const handleFullScreen = () => {
    if (!isFullScreen) {
      if (appRef.current.requestFullscreen) {
        appRef.current.requestFullscreen();
      } else if (appRef.current.webkitRequestFullscreen) {
        appRef.current.webkitRequestFullscreen();
      } else if (appRef.current.msRequestFullscreen) {
        appRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Render helpers
  const renderContent = () => {
    const commonProps = { isFullScreen };
    
    switch (currentView) {
      case "FeedPlayer":
        return (
          <div className="feed-player-container">
            {!isPopup && (
               <button className="popup-btn" onClick={() => setIsPopup(true)}>
                 <i className="ri-links-line"></i>
                 </button>    
            )}
            {isPopup && (
              <Popup {...{ setVideoList, setCurrentVideoSrc, setIsPopup }} />
            )}
            <VideoPlayer
              autoplay={true}
              isFullScreen={isFullScreen}
              setIsFullScreen={setIsFullScreen}
              handleFullScreen={handleFullScreen}
            />
          </div>
        );
      case "MemberSense":
        return (
          <MemberSense
            onValidToken={handleLogin}
            initialToken={token}
            isLoading={isLoading}
            error={error}
            isLoggedIn={isLoggedIn}
            isLoggingOut={isLoggingOut}
            serverInfo={serverInfo}
            isFullScreen={isFullScreen}
            useMockData={useMockData}
            onToggleMockData={() => setUseMockData(!useMockData)}
            {...commonProps}
          />
        );
      case "Showcase":
        return (
          <MemberShowcase
            token={token}
            members={members}
            isLoading={isLoading}
            {...commonProps}
          />
        );
      case "DiscordViewer":
        return (
          <DiscordChannelViewer
            channels={channels}
            messages={messages}
            selectedChannel={selectedChannel}
            onChannelSelect={setSelectedChannel}
            isLoading={isLoading}
            {...commonProps}
          />
        );
      default:
        return <div>Select a view</div>;
    }
  };

  const renderNavItems = () => {
    const items = [
      { id: "FeedPlayer", icon: Video, label: "Feed Player" },
      { id: "MemberSense", icon: Users, label: "MemberSense" },
      ...(token ? memberSenseDropdownItems : []),
    ];

    return items.map((item) => (
      <button
        key={item.id}
        onClick={() => {
          handleViewChange(item.id);
          if (isFullScreen) setIsMenuOpen(false);
        }}
        className={currentView === item.id ? "active" : ""}
        title={item.label}
      >
        <item.icon size={24} />
        <span>{item.label}</span>
      </button>
    ));
  };

  return (
    <ContextProvider>
      <div className={`App ${isFullScreen ? "fullscreen" : ""}`} ref={appRef}>
        {isFullScreen ? (
          <div className="fullscreen-nav">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="menu-btn"
            >
              <Menu size={24} />
            </button>
            {isMenuOpen && (
              <div className="fullscreen-menu">
                {renderNavItems()}
                <button
                  onClick={handleFullScreen}
                  className="fullscreen-toggle"
                >
                  <Minimize size={24} />
                  <span>Exit Fullscreen</span>
                </button>
                {token && (
                  <button onClick={handleLogout} className="logout-btn">
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <header className="app-header">
            <nav className="app-nav">
              {renderNavItems()}
              <button onClick={handleFullScreen} className="fullscreen-toggle">
                {isFullScreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
              {token && (
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              )}
            </nav>
          </header>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <p>{error}</p>
          </div>
        )}
        <main
          className={`app-content ${isTransitioning ? "fade-out" : "fade-in"}`}
        >
          {renderContent()}
        </main>
      </div>
    </ContextProvider>
  );
}

export default App;
