import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { handleError, handleSuccess } from '../utils';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function Home() {
  const [loggedInUser, setLoggedInUser] = useState('');
  const navigate = useNavigate();

  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);

  const [modelName, setModelName] = useState(null);
  const [bgColor, setBgColor] = useState(() => localStorage.getItem('three_viewer_bg') || '#111827');
  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('three_viewer_presets') || '[]');
    } catch {
      return [];
    }
  });

  // ✅ Initialize Scene
  useEffect(() => {
    setLoggedInUser(localStorage.getItem('loggedInUser'));

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);

// NEW API — replace outputEncoding with outputColorSpace
renderer.outputColorSpace = THREE.SRGBColorSpace;

rendererRef.current = renderer;


    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controlsRef.current = controls;

    mountRef.current.appendChild(renderer.domElement);

    const handleResize = () => {
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // ✅ Persist background color
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.background = new THREE.Color(bgColor);
    localStorage.setItem('three_viewer_bg', bgColor);
  }, [bgColor]);

  
// useEffect(() => {
//   const savedPresets = localStorage.getItem('three_viewer_presets');
//   if (savedPresets) {
//     setPresets(JSON.parse(savedPresets));
//   }
// }, []);
useEffect(() => {
  setPresets([]);               // reset UI list
  localStorage.removeItem('three_viewer_presets');   // remove saved presets
}, []);


  // ✅ Model Cleanup Helper
  const disposeModel = (object) => {
    if (!object) return;
    object.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose && m.dispose());
          } else {
            child.material.dispose && child.material.dispose();
          }
        }
      }
    });
  };

  // ✅ Load Model from File
  const loadModelFromFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const url = URL.createObjectURL(file);

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      disposeModel(modelRef.current);
      modelRef.current = null;
    }

    const loader =
      ext === 'glb' || ext === 'gltf' ? new GLTFLoader() :
      ext === 'obj' ? new OBJLoader() : null;
    if (!loader) return alert('Unsupported file type: ' + ext);

    loader.load(url, (gltf) => {
      const obj = gltf.scene || gltf;
      obj.name = file.name;
      centerAndScale(obj);
      sceneRef.current.add(obj);
      modelRef.current = obj;
      setModelName(file.name);
      URL.revokeObjectURL(url);
    });
  };

  // ✅ Center and Scale Model
  const centerAndScale = (obj) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    obj.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 1.5 / maxDim;
      obj.scale.setScalar(scale);
    }

    const cam = cameraRef.current;
    cam.position.set(0, Math.max(1.2, size.y * 1.5), Math.max(2.5, size.z * 2.0));
    cam.lookAt(0, 0, 0);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const onFileChange = (e) => {
    const file = e.target.files[0];
    if (file) loadModelFromFile(file);
  };



  // ✅ Save Preset to MongoDB
const savePreset = async (name) => {
  const cam = cameraRef.current;
  const controls = controlsRef.current;

  if (!loggedInUser) {
    handleError('You must be logged in to save a view');
    return;
  }

  // Frontend preset object
  const preset = {
    id: crypto.randomUUID(),   // Unique ID for frontend (React/UI)
    user: loggedInUser,
    name: name || `Preset ${presets.length + 1}`,
    camera: {
      position: cam.position.toArray(),
      quaternion: cam.quaternion.toArray(),
    },
    controlsTarget: controls.target.toArray(),
    modelName: modelName || 'unknown',
    createdAt: new Date().toISOString(),
  };

  try {
    // Save to backend (MongoDB)
    const res = await fetch('http://localhost:3080/api/viewer/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });

    const data = await res.json();

    if (res.ok) {
      handleSuccess('View saved to database!');

      // Attach MongoDB _id to the preset
      const savedPreset = { ...preset, _id: data.data._id };

      // Update UI list
      const updated = [savedPreset, ...presets];
      setPresets(updated);

      // Save to localStorage
      localStorage.setItem('three_viewer_presets', JSON.stringify(updated));
    } else {
      handleError(data.error || 'Failed to save');
    }
  } catch (err) {
    handleError('Error connecting to server');
  }
};


  // ✅ Apply Preset
const applyPreset = (preset) => {
  const cam = cameraRef.current;
  const controls = controlsRef.current;

  cam.position.fromArray(preset.camera.position);
  cam.quaternion.fromArray(preset.camera.quaternion);
  controls.target.fromArray(preset.controlsTarget);
  controls.update();
};


  // ✅ Delete Preset
//   const deletePreset = (id) => {
//   const updated = presets.filter((p) => p.id !== id);
//   setPresets(updated);
//   localStorage.setItem('three_viewer_presets', JSON.stringify(updated));
// };

// ⭐ DELETE PRESET (Frontend + MongoDB + LocalStorage)
const deletePreset = async (id, mongoId) => {
  try {

    // 1. Delete from MongoDB only if _id exists
    if (mongoId) {
      const res = await fetch(`http://localhost:3080/api/viewer/delete/${mongoId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        return handleError(data.error || "Failed to delete from server");
      }
    }

    // 2. Remove from frontend list
    const updated = presets.filter((p) =>
      p.id !== id && p._id !== mongoId
    );

    setPresets(updated);

    // 3. Update localStorage
    localStorage.setItem('three_viewer_presets', JSON.stringify(updated));

    handleSuccess('Preset deleted successfully');

  } catch (err) {
    handleError('Failed to delete preset');
  }
};




  // ✅ Export / Import Presets
  const exportPresets = () => {
    const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'camera_presets.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // const importPresets = (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;
  //   const reader = new FileReader();
  //   reader.onload = (event) => {
  //     try {
  //       const imported = JSON.parse(event.target.result);
  //       if (Array.isArray(imported)) {
  //         const merged = [...imported, ...presets];
  //         setPresets(merged);
  //         localStorage.setItem('three_viewer_presets', JSON.stringify(merged));
  //         handleSuccess('Presets imported successfully!');
  //       } else handleError('Invalid file format');
  //     } catch {
  //       handleError('Failed to import presets');
  //     }
  //   };
  //   reader.readAsText(file);
  // };

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('loggedInUser');
    handleSuccess('User Logged out');
    setTimeout(() => navigate('/login'), 1000);
  };  

  // ✅ Render UI
  return (
    <div className='container-fluid mt-3'>
      <div className='row mb-3'>
        <div className='col-md-4 text-center'>
          <h1 className='text-capitalize'>Welcome {loggedInUser}</h1>
        </div>
        <div className='col-md-8'>
          <button className='float-end me-3 btn btn-danger' onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className='container-fluid p-4 bg-light'>
        <h2 className='text-center mb-4'>3D Model Viewer</h2>

        <div className='row g-4'>
          {/* Viewer */}
          <div className='col-md-8'>
            <div ref={mountRef} className='w-100 bg-dark rounded' style={{ height: '600px' }}></div>
          </div>

          {/* Sidebar */}
          <div className='col-md-4'>
            <div className='card mb-3'>
              <div className='card-body'>
                <h6>Upload 3D model (.glb .gltf .obj)</h6>
                <input type='file' accept='.glb,.gltf,.obj' onChange={onFileChange} className='form-control mt-2' />
                <small className='text-muted'>Current model: {modelName || 'None'}</small>
              </div>
            </div>

            <div className='card mb-3'>
              <div className='card-body'>
                <h6>Camera Presets</h6>
                <div className='d-flex justify-content-between mb-2'>
                  <button onClick={() => savePreset()} className='btn btn-primary btn-sm'>
                    Save View
                  </button>
                  <button onClick={exportPresets} className='btn btn-success btn-sm'>
                    Export
                  </button>
                  {/* <label className='btn btn-secondary btn-sm mb-0'>
                    Import
                    <input type='file' accept='.json' onChange={importPresets} hidden />
                  </label> */}
                </div>

                <div className='overflow-auto' style={{ maxHeight: '200px' }}>
                  {presets.length === 0 && <div className='text-muted small'>No presets saved.</div>}
                  {presets.map((p) => (
                    <div key={p.id} className='d-flex justify-content-between align-items-center border-bottom py-2'>
                      <div>
                        <div className='fw-semibold small'>{p.name}</div>
                        <div className='text-muted small'>{new Date(p.createdAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <button onClick={() => applyPreset(p)} className='btn btn-outline-secondary btn-sm me-2'>
                          Apply
                        </button>
                        {/* <button onClick={() => deletePreset(p.id)} className='btn btn-outline-danger btn-sm'>
                          Delete
                        </button> */}
                        {/* <button onClick={() => deletePreset(p.id, p._id)}>
                          Delete
                        </button> */}
                          <button onClick={() => deletePreset(p.id, p._id)}>
                            Delete
                          </button>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='card'>
              <div className='card-body'>
                <h6>Background</h6>
                <input type='color' value={bgColor} onChange={(e) => setBgColor(e.target.value)} className='form-control form-control-color mt-2' />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
