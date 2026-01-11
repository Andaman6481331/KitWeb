import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomeView from './views/HomeView'
import Testing from './views/Testing'
import styles from './App.module.css'

function App() {
  return (
    <div>
      <div className={styles.NavBar}>
        <div className={styles.navGroup}>
          <img src="/components/icons/twitter.svg" alt="logo" className={styles.logo} />
          <div>
            <h1>Kitcharoen Webpage</h1>
            <p>376 Wanich 1 Chakkrawat Samphantawong Bangkok</p>
          </div>
        </div>
        <div className={styles.navGroup}>
          <button className={styles.item}>
            Your<br />Suggestion
          </button>
          <button className={styles.item}>Order</button>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/test" element={<Testing />} />
      </Routes>
    </div>
  )
}

export default App
