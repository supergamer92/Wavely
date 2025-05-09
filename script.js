// script.js
// DOM Elements
const fileUploadInput = document.getElementById('file-upload-input');
const playlistModal = document.getElementById('playlist-modal');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const closeModalBtn = document.getElementById('close-modal');
const cancelPlaylistBtn = document.getElementById('cancel-playlist');
const savePlaylistBtn = document.getElementById('save-playlist');
const playlistsContainer = document.getElementById('playlists-container');
const addSongsBtn = document.getElementById('add-songs-btn');
const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
const queueContainer = document.getElementById('queue-container');
const currentPlaylistName = document.getElementById('current-playlist-name');
const contextMenu = document.getElementById('context-menu');
const contextDelete = document.getElementById('context-delete');
const deleteModal = document.getElementById('delete-modal');
const closeDeleteModal = document.getElementById('close-delete-modal');
const cancelDelete = document.getElementById('cancel-delete');
const confirmDelete = document.getElementById('confirm-delete');

// Player Elements
const currentSongTitle = document.getElementById('current-song-title');
const currentSongArtist = document.getElementById('current-song-artist');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const loopPlaylistBtn = document.getElementById('loop-playlist-btn');
const progressSlider = document.getElementById('progress-slider');
const currentTime = document.getElementById('current-time');
const duration = document.getElementById('duration');
const volumeSlider = document.getElementById('volume-slider');

// Visualizer Elements
const visualizerCanvas = document.getElementById('audio-visualizer');
const visualizerCtx = visualizerCanvas.getContext('2d');

// Audio
const audio = new Audio();
audio.volume = 0.7;
let audioContext;
let analyser;
let dataArray;
let source;
let animationId;

// State
let currentFiles = [];
let playlists = JSON.parse(localStorage.getItem('playlists')) || [];
let currentPlaylist = null;
let currentSongIndex = -1;
let isPlaying = false;
let isShuffled = false;
let isLoopPlaylist = false;
let originalQueue = [];
let currentQueue = [];
let contextMenuItem = null;
let contextMenuType = null;
let isDraggingProgress = false;

// Initialize visualizer canvas size
function initVisualizer() {
    const size = Math.min(visualizerCanvas.parentElement.clientWidth, 200);
    visualizerCanvas.width = size;
    visualizerCanvas.height = size;

    drawInitialVisualizer();
}

function drawInitialVisualizer() {
    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    const centerX = visualizerCanvas.width / 2;
    const centerY = visualizerCanvas.height / 2;
    const radius = Math.min(visualizerCanvas.width, visualizerCanvas.height) * 0.4;

    const gradient = visualizerCtx.createRadialGradient(
        centerX, centerY, radius * 0.3,
        centerX, centerY, radius
    );
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(28, 25, 88, 0.8)');

    visualizerCtx.beginPath();
    visualizerCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    visualizerCtx.fillStyle = gradient;
    visualizerCtx.fill();

    // Add subtle rings
    for (let i = 3; i >= 1; i--) {
        const ringRadius = radius * (i / 4);
        visualizerCtx.beginPath();
        visualizerCtx.arc(centerX, centerY, ringRadius, 0, 2 * Math.PI);
        visualizerCtx.strokeStyle = `rgba(168, 85, 247, ${0.1 + (0.2 * (3 - i))})`;
        visualizerCtx.lineWidth = 0.5;
        visualizerCtx.stroke();
    }
}

function setupAudioAnalyzer() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

function visualize() {
    if (!isPlaying) {
        drawInitialVisualizer();
        return;
    }

    animationId = requestAnimationFrame(visualize);

    analyser.getByteFrequencyData(dataArray);

    const width = visualizerCanvas.width;
    const height = visualizerCanvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;
    const barWidth = 1.5;
    const maxBars = 60;

    visualizerCtx.clearRect(0, 0, width, height);

    // Draw background gradient
    const bgGradient = visualizerCtx.createRadialGradient(
        centerX, centerY, radius * 0.3,
        centerX, centerY, radius
    );
    bgGradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
    bgGradient.addColorStop(1, 'rgba(28, 25, 88, 0.5)');

    visualizerCtx.beginPath();
    visualizerCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    visualizerCtx.fillStyle = bgGradient;
    visualizerCtx.fill();

    // Normalize frequencies
    const numFrequencies = dataArray.length;
    const frequencies = new Array(maxBars);
    const groupSize = Math.floor(numFrequencies / maxBars);

    for (let i = 0; i < maxBars; i++) {
        let sum = 0;
        const start = i * groupSize;
        const end = Math.min(start + groupSize, numFrequencies);

        for (let j = start; j < end; j++) {
            sum += dataArray[j];
        }

        frequencies[i] = sum / (end - start) / 255;
    }

    // Draw frequency bars
    for (let i = 0; i < maxBars; i++) {
        const value = frequencies[i];
        const angle = (i / maxBars) * Math.PI * 2 - Math.PI / 2;
        const lineHeight = value * radius * 0.8;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius - lineHeight);
        const y2 = centerY + Math.sin(angle) * (radius - lineHeight);

        // Create gradient
        const gradient = visualizerCtx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, `rgba(168, 85, 247, ${0.5 + value * 0.5})`);
        gradient.addColorStop(1, `rgba(139, 92, 246, ${0.2 + value * 0.8})`);

        visualizerCtx.beginPath();
        visualizerCtx.moveTo(x1, y1);
        visualizerCtx.lineTo(x2, y2);
        visualizerCtx.lineWidth = 1.5 + value * 2.5;
        visualizerCtx.strokeStyle = gradient;
        visualizerCtx.stroke();
    }
}

// Event Listeners
fileUploadInput.addEventListener('change', handleFileUpload);
createPlaylistBtn.addEventListener('click', () => playlistModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => playlistModal.classList.add('hidden'));
cancelPlaylistBtn.addEventListener('click', () => playlistModal.classList.add('hidden'));
savePlaylistBtn.addEventListener('click', createPlaylist);
addSongsBtn.addEventListener('click', () => fileUploadInput.click());
deletePlaylistBtn.addEventListener('click', confirmDeletePlaylist);

// Context menu event listeners
contextDelete.addEventListener('click', () => {
    if (contextMenuType === 'playlist') {
        confirmDeletePlaylist(contextMenuItem);
    } else if (contextMenuType === 'song') {
        confirmDeleteSong(contextMenuItem);
    }
    contextMenu.classList.add('hidden');
});

document.addEventListener('click', () => {
    contextMenu.classList.add('hidden');
});

// Delete modal event listeners
closeDeleteModal.addEventListener('click', () => deleteModal.classList.add('hidden'));
cancelDelete.addEventListener('click', () => deleteModal.classList.add('hidden'));
confirmDelete.addEventListener('click', () => {
    handleDelete();
    deleteModal.classList.add('hidden');
});

// Player Controls
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', toggleShuffle);
loopPlaylistBtn.addEventListener('click', toggleLoopPlaylist);

// Progress and volume
audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('ended', handleSongEnd);
audio.addEventListener('loadedmetadata', updateSongDuration);
audio.addEventListener('durationchange', updateSongDuration);
volumeSlider.addEventListener('input', updateVolume);

// Visualizer setup
window.addEventListener('resize', initVisualizer);

// Progress slider events
progressSlider.addEventListener('input', () => {
    isDraggingProgress = true;
    const seekTime = (progressSlider.value / 100) * audio.duration;
    currentTime.textContent = formatTime(seekTime);
});

progressSlider.addEventListener('change', seek);
progressSlider.addEventListener('mousedown', () => isDraggingProgress = true);
progressSlider.addEventListener('mouseup', () => {
    if (isDraggingProgress) {
        seek();
        isDraggingProgress = false;
    }
});

// File Upload Handler
function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!currentPlaylist) {
        const date = new Date();
        const playlistName = `My Playlist ${date.toLocaleDateString()}`;
        createNewPlaylist(playlistName);
    }

    const songsToAdd = [];

    files.forEach(file => {
        const songId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        // Extract metadata from filename (simple approach)
        let songName = file.name.replace(/\.[^/.]+$/, "");
        let artist = "Unknown Artist";

        // Try to split filename if it contains a hyphen or underscore
        const separator = songName.includes(" - ") ? " - " : songName.includes("_") ? "_" : null;
        if (separator) {
            const parts = songName.split(separator);
            if (parts.length >= 2) {
                artist = parts[0].trim();
                songName = parts[1].trim();
            }
        }

        const newSong = {
            id: songId,
            title: songName,
            artist: artist,
            filename: file.name,
            size: file.size,
            file: file
        };

        songsToAdd.push(newSong);
    });

    // Add songs immediately to playlist
    currentPlaylist.songs.push(...songsToAdd);
    savePlaylists();
    renderPlaylist(currentPlaylist);

    // Create temporary object URLs for duration detection
    songsToAdd.forEach(song => {
        const objectUrl = URL.createObjectURL(song.file);
        const tempAudio = new Audio();
        tempAudio.src = objectUrl;

        tempAudio.addEventListener('loadedmetadata', () => {
            song.duration = tempAudio.duration;
            URL.revokeObjectURL(objectUrl);

            // Update the song in the playlist
            const songIndex = currentPlaylist.songs.findIndex(s => s.id === song.id);
            if (songIndex !== -1) {
                currentPlaylist.songs[songIndex].duration = song.duration;
                savePlaylists();

                // If this song is in the current queue, update it
                const queueIndex = currentQueue.findIndex(s => s.id === song.id);
                if (queueIndex !== -1) {
                    currentQueue[queueIndex].duration = song.duration;
                    renderQueue();
                }

                // If this song is the currently playing one, update duration display
                if (currentSongIndex === queueIndex) {
                    duration.textContent = formatTime(song.duration);
                }
            }
        });
    });

    fileUploadInput.value = '';
}

function createPlaylist() {
    const name = document.getElementById('playlist-name').value.trim();
    if (!name) {
        document.getElementById('playlist-name').classList.add('ring-2', 'ring-red-500');
        setTimeout(() => {
            document.getElementById('playlist-name').classList.remove('ring-2', 'ring-red-500');
        }, 1000);
        return;
    }

    createNewPlaylist(name);

    document.getElementById('playlist-name').value = '';
    playlistModal.classList.add('hidden');
}

function createNewPlaylist(name) {
    const newPlaylist = {
        id: Date.now().toString(),
        name: name,
        songs: []
    };

    playlists.push(newPlaylist);
    savePlaylists();
    selectPlaylist(newPlaylist);
    renderPlaylists();
}

function savePlaylists() {
    localStorage.setItem('playlists', JSON.stringify(playlists));
}

function loadPlaylists() {
    const savedPlaylists = localStorage.getItem('playlists');

    if (savedPlaylists) {
        playlists = JSON.parse(savedPlaylists);
    }
}

function renderPlaylists() {
    playlistsContainer.innerHTML = '';

    if (playlists.length === 0) {
        playlistsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500 flex flex-col items-center">
                <div class="relative mb-2">
                    <div class="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center spinner">
                        <i class="fas fa-compact-disc text-purple-500"></i>
                    </div>
                </div>
                <p class="text-sm">No playlists yet</p>
            </div>
        `;
        return;
    }

    playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'bg-gray-750 rounded-lg p-3 album-cover border border-gray-700 hover:border-purple-700 transition cursor-pointer flex items-center mb-2';

        if (currentPlaylist && playlist.id === currentPlaylist.id) {
            playlistElement.classList.add('border-purple-600', 'bg-gray-700');
        }

        playlistElement.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center mr-3">
                <i class="fas fa-music text-purple-500"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm text-purple-300 truncate">${playlist.name}</h3>
                <p class="text-xs text-gray-400">${playlist.songs.length} ${playlist.songs.length === 1 ? 'song' : 'songs'}</p>
            </div>
            <button class="text-gray-500 hover:text-white ml-1 context-menu-trigger">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        `;

        playlistElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('context-menu-trigger') &&
                !e.target.closest('.context-menu-trigger')) {
                selectPlaylist(playlist);
            }
        });

        const contextTrigger = playlistElement.querySelector('.context-menu-trigger');
        contextTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            showContextMenu(e, playlist, 'playlist');
        });

        playlistsContainer.appendChild(playlistElement);
    });
}

function selectPlaylist(playlist) {
    currentPlaylist = playlist;
    currentSongIndex = -1;
    isPlaying = false;
    updatePlayButton();

    renderPlaylist(playlist);
}

function renderPlaylist(playlist) {
    if (!playlist) {
        currentPlaylistName.textContent = "Queue";
        queueContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500 flex flex-col items-center">
                <i class="fas fa-music text-3xl mb-2 text-purple-700/30 pulse-slow"></i>
                <p class="text-sm">No playlist selected</p>
            </div>
        `;
        return;
    }

    currentPlaylistName.textContent = playlist.name;

    if (playlist.songs.length === 0) {
        queueContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500 flex flex-col items-center">
                <i class="fas fa-music text-3xl mb-2 text-purple-700/30 pulse-slow"></i>
                <p class="text-sm">No songs in this playlist</p>
            </div>
        `;
        return;
    }

    originalQueue = [...playlist.songs];
    currentQueue = [...originalQueue];

    if (isShuffled) {
        shuffleQueuePreserveCurrent();
    }

    renderQueue();
}

function renderQueue() {
    queueContainer.innerHTML = '';

    currentQueue.forEach((song, index) => {
        const songElement = document.createElement('div');
        songElement.className = `flex items-center justify-between p-2 rounded-lg song-item transition ${index === currentSongIndex ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}`;
        songElement.innerHTML = `
            <div class="flex items-center flex-1 min-w-0" data-index="${index}">
                <div class="w-8 h-8 rounded-lg ${index === currentSongIndex ? 'bg-purple-600/20' : 'bg-gray-700'} flex items-center justify-center mr-2 flex-shrink-0">
                    ${index === currentSongIndex ?
                        `<i class="fas fa-volume-up text-purple-400 text-xs"></i>` :
                        `<span class="text-xs ${index === currentSongIndex ? 'text-purple-400' : 'text-gray-400'}">${index + 1}</span>`}
                </div>
                <div class="truncate flex-1 min-w-0">
                    <p class="text-sm font-medium truncate ${index === currentSongIndex ? 'text-purple-400' : 'text-gray-200'}">${song.title}</p>
                    <p class="text-xs ${index === currentSongIndex ? 'text-purple-300' : 'text-gray-400'} truncate mt-0.5">${song.artist}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-xs ${index === currentSongIndex ? 'text-purple-300' : 'text-gray-500'}">${song.duration ? formatTime(song.duration) : '--'}</span>
                <button class="text-gray-500 hover:text-white context-menu-trigger">
                    <i class="fas fa-ellipsis-v text-xs"></i>
                </button>
            </div>
        `;

        const songInfo = songElement.querySelector('div[data-index]');
        songInfo.addEventListener('click', () => playSong(index));

        const contextTrigger = songElement.querySelector('.context-menu-trigger');
        contextTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            showContextMenu(e, { song, index }, 'song');
        });

        queueContainer.appendChild(songElement);
    });
}

function playSong(index) {
    if (!currentPlaylist || index < 0 || index >= currentQueue.length) return;

    // If we're already playing this song, just toggle play/pause
    if (currentSongIndex === index) {
        togglePlay();
        return;
    }

    // Release previous object URL if it exists
    if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
    }

    currentSongIndex = index;
    const song = currentQueue[index];

    if (!song.file) {
        alert('File missing for this song. Please re-add the audio file.');
        return;
    }

    const objectUrl = URL.createObjectURL(song.file);
    audio.src = objectUrl;

    currentSongTitle.textContent = song.title;
    currentSongArtist.textContent = song.artist;

    setupAudioAnalyzer();

    // Add pulse animation to play button
    playBtn.classList.add('pulse-animation');

    isPlaying = true;
    audio.play().then(() => {
        initVisualizer();
        visualize();
        updatePlayButton();
        progressSlider.value = 0;

        if (song.duration) {
            duration.textContent = formatTime(song.duration);
        } else {
            duration.textContent = '--';
        }
    }).catch(error => {
        console.error('Error playing song:', error);
        alert('Error playing song: ' + error.message);
        isPlaying = false;
        updatePlayButton();
        playBtn.classList.remove('pulse-animation');
    });

    renderQueue();
}

function togglePlay() {
    if (!currentPlaylist || currentQueue.length === 0) return;

    if (currentSongIndex === -1) {
        // Start playing the first song if nothing is selected
        playSong(0);
        playBtn.classList.add('pulse-animation');
    } else {
        isPlaying = !isPlaying;
        if (isPlaying) {
            playBtn.classList.add('pulse-animation');
            audio.play().then(() => {
                visualize();
                updatePlayButton();
            }).catch(error => {
                console.error('Error playing:', error);
                isPlaying = false;
                updatePlayButton();
                playBtn.classList.remove('pulse-animation');
            });
        } else {
            audio.pause();
            cancelAnimationFrame(animationId);
            drawInitialVisualizer();
            updatePlayButton();
            playBtn.classList.remove('pulse-animation');
        }
    }
}

function updatePlayButton() {
    const playIcon = playBtn.querySelector('i');
    if (isPlaying) {
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    } else {
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    }
}

function playPrevious() {
    if (!currentPlaylist || currentQueue.length === 0) return;

    let newIndex = currentSongIndex - 1;
    if (newIndex < 0) {
        if (isLoopPlaylist) {
            newIndex = currentQueue.length - 1;
        } else {
            return;
        }
    }
    playSong(newIndex);
}

function playNext() {
    if (!currentPlaylist || currentQueue.length === 0) return;

    let newIndex = currentSongIndex + 1;
    if (newIndex >= currentQueue.length) {
        if (isLoopPlaylist) {
            newIndex = 0;
        } else {
            return;
        }
    }
    playSong(newIndex);
}

function toggleShuffle() {
    isShuffled = !isShuffled;
    shuffleBtn.classList.toggle('text-purple-400', isShuffled);
    shuffleBtn.classList.toggle('text-gray-400', !isShuffled);

    if (!currentPlaylist || currentPlaylist.squares.length === 0) return;

    shuffleQueuePreserveCurrent();
    renderQueue();
}

function toggleLoopPlaylist() {
    isLoopPlaylist = !isLoopPlaylist;
    loopPlaylistBtn.classList.toggle('text-purple-400', isLoopPlaylist);
    loopPlaylistBtn.classList.toggle('text-gray-400', !isLoopPlaylist);
}

function handleSongEnd() {
    if (isLoopPlaylist) {
        playNext();
    } else {
        // If we're at the end of the queue
        if (currentSongIndex === currentQueue.length - 1) {
            stopCurrentPlayback();
        } else {
            playNext();
        }
    }
}

function updateProgress() {
    if (!isDraggingProgress && audio.duration) {
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        progressSlider.value = isNaN(progressPercent) ? 0 : progressPercent;
    }

    currentTime.textContent = formatTime(audio.currentTime);
}

function updateSongDuration() {
    if (audio.duration) {
        duration.textContent = formatTime(audio.duration);

        // Update the current song in the queue with duration if known
        if (currentSongIndex >= 0 && currentSongIndex < currentQueue.length) {
            const currentSong = currentQueue[currentSongIndex];
            if (currentSong && !currentSong.duration) {
                currentSong.duration = audio.duration;
                savePlaylists();
            }
        }
    }
}

function seek() {
    if (audio.duration) {
        const seekTime = (progressSlider.value / 100) * audio.duration;
        audio.currentTime = seekTime;
        currentTime.textContent = formatTime(seekTime);
    }
}

function updateVolume() {
    audio.volume = volumeSlider.value;
}

function formatTime(seconds) {
    if (isNaN(seconds) || seconds === undefined) return "--";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function showContextMenu(event, item, type) {
    contextMenuItem = item;
    contextMenuType = type;

    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.classList.remove('hidden');

    event.preventDefault();
    event.stopPropagation();
}

function confirmDeletePlaylist(playlist = null) {
    if (!playlist && !currentPlaylist) return;

    const targetPlaylist = playlist || currentPlaylist;

    document.getElementById('delete-modal-title').textContent = "Delete Playlist";
    document.getElementById('delete-modal-message').textContent = `Are you sure you want to delete the playlist "${targetPlaylist.name}" and all its songs?`;
    deleteModal.classList.remove('hidden');
}

function confirmDeleteSong(songData) {
    document.getElementById('delete-modal-title').textContent = "Delete Song";
    document.getElementById('delete-modal-message').textContent = `Are you sure you want to delete the song "${songData.song.title}" from this playlist?`;
    deleteModal.classList.remove('hidden');
}

function handleDelete() {
    if (contextMenuType === 'playlist') {
        deletePlaylist(contextMenuItem || currentPlaylist);
    } else if (contextMenuType === 'song') {
        deleteSong(contextMenuItem);
    }
}

function deletePlaylist(playlist) {
    if (!playlist) return;

    const index = playlists.findIndex(p => p.id === playlist.id);
    if (index !== -1) {
        playlists.splice(index, 1);
        savePlaylists();

        if (currentPlaylist && currentPlaylist.id === playlist.id) {
            stopCurrentPlayback();
            currentPlaylist = null;
            renderPlaylist(null);
        }

        renderPlaylists();
    }
}

function deleteSong(songInfo) {
    if (!currentPlaylist) return;

    // Remove from the playlist
    const songIndex = currentPlaylist.songs.findIndex(s => s.id === songInfo.song.id);
    if (songIndex === -1) return;

    currentPlaylist.songs.splice(songIndex, 1);

    // Handle playback and queues
    handleSongDeletionInQueue(songInfo.song.id);

    // Save changes
    savePlaylists();

    // Re-render the queue
    renderQueue();
}

function handleSongDeletionInQueue(songId) {
    // If this was the currently playing song, stop it
    if (currentSongIndex !== -1 && currentQueue[currentSongIndex]?.id === songId) {
        stopCurrentPlayback();
    }

    // Rebuild queues
    originalQueue = [...currentPlaylist.songs];
    currentQueue = [...originalQueue];

    if (isShuffled) {
        shuffleQueuePreserveCurrent();
    }

    // If the deleted song was before our current index, adjust the index
    const deletedIndex = currentQueue.findIndex(s => s.id === songId);
    if (deletedIndex !== -1 && deletedIndex < currentSongIndex) {
        currentSongIndex--;
    }

    // If we were at the end of the queue and deleted a song, adjust index
    if (currentSongIndex >= currentQueue.length) {
        currentSongIndex = -1;
    }

    // If there are no more songs, stop playback
    if (currentQueue.length === 0) {
        stopCurrentPlayback();
    }
}

function shuffleQueuePreserveCurrent() {
    // Preserve currently playing song position if applicable
    const playingSong = currentSongIndex !== -1 ? currentQueue[currentSongIndex] : null;

    for (let i = currentQueue.length - 1; i > 0; i--) {
        if (i === currentSongIndex) continue;
        const j = Math.floor(Math.random() * (i + 1));
        if (j === currentSongIndex) continue;
        [currentQueue[i], currentQueue[j]] = [currentQueue[j], currentQueue[i]];
    }

    // If current song was moved, put it back
    if (playingSong) {
        const newIndex = currentQueue.findIndex(song => song.id === playingSong.id);
        if (newIndex !== -1 && newIndex !== currentSongIndex) {
            [currentQueue[newIndex], currentQueue[currentSongIndex]] = [currentQueue[currentSongIndex], currentQueue[newIndex]];
        }
    }
}

function stopCurrentPlayback() {
    isPlaying = false;
    updatePlayButton();
    audio.pause();
    cancelAnimationFrame(animationId);
    drawInitialVisualizer();

    if (audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
    }

    audio.src = '';
    currentSongTitle.textContent = 'No song selected';
    currentSongArtist.textContent = '--';
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
    progressSlider.value = 0;

    currentSongIndex = -1;
    playBtn.classList.remove('pulse-animation');
}

// Initialize the app
function init() {
    setupAudioAnalyzer();
    initVisualizer();
    loadPlaylists();
    renderPlaylists();

    // Set initial volume
    updateVolume();

    // Set default playlist if available
    if (playlists.length > 0) {
        selectPlaylist(playlists[0]);
    } else {
        // Create a default playlist if none exist
        createNewPlaylist("My Playlist");
    }
}

// Start the app
init();