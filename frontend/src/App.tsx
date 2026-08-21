import { CameraBackground } from './components/CameraBackground';
import { GoldfishSchool } from './components/GoldfishSchool';
import { Poi } from './components/Poi';

function App() {
  return (
    <>
      <CameraBackground />
      <GoldfishSchool />
      <main className="container py-5 position-relative">
        <div className="bg-white bg-opacity-75 rounded-3 p-3 mb-3">
          <h1 className="fs-2 fw-bold">金魚掬い</h1>
          <p className="text-body-secondary mb-0">
            スマートフォンの加速度センサーでポイを操作し、カメラ映像に重ねて表示される金魚をすくう体験アプリです。
          </p>
        </div>
        <Poi />
      </main>
    </>
  );
}

export default App;
