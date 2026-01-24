import React, { useRef, useEffect } from 'react'
import styles from './HomeView.module.css'

interface DragData {
  dragging: boolean
  startX: number
  scrollLeft: number
}

function HomeView() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragDataRef = useRef<DragData>({ dragging: false, startX: 0, scrollLeft: 0 })

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const startDragging = (event: MouseEvent | TouchEvent) => {
      event.preventDefault()
      dragDataRef.current.dragging = true
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      dragDataRef.current.startX = clientX
      dragDataRef.current.scrollLeft = scroller.scrollLeft
    }

    const stopDragging = () => {
      dragDataRef.current.dragging = false
      const scrollerWidth = scroller.offsetWidth
      const item = scroller.querySelector(`.${styles.item}`) as HTMLElement
      if (!item) return
      const itemWidth = item.offsetWidth + 20 // Including margin
      const scrollLeft = scroller.scrollLeft
      const index = Math.round(scrollLeft / itemWidth)
      scroller.scrollTo({
        left: index * itemWidth,
        behavior: 'smooth'
      })
    }

    const onDragging = (event: MouseEvent | TouchEvent) => {
      if (!dragDataRef.current.dragging) return
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
      const x = clientX
      const startX = dragDataRef.current.startX
      const scrollLeft = dragDataRef.current.scrollLeft
      const walk = (x - startX) * 2 // Scroll speed multiplier
      scroller.scrollLeft = scrollLeft - walk
    }

    scroller.addEventListener('mousedown', startDragging as EventListener)
    scroller.addEventListener('mousemove', onDragging as EventListener)
    scroller.addEventListener('mouseup', stopDragging)
    scroller.addEventListener('mouseleave', stopDragging)
    scroller.addEventListener('touchstart', startDragging as EventListener)
    scroller.addEventListener('touchmove', onDragging as EventListener)
    scroller.addEventListener('touchend', stopDragging)

    return () => {
      scroller.removeEventListener('mousedown', startDragging as EventListener)
      scroller.removeEventListener('mousemove', onDragging as EventListener)
      scroller.removeEventListener('mouseup', stopDragging)
      scroller.removeEventListener('mouseleave', stopDragging)
      scroller.removeEventListener('touchstart', startDragging as EventListener)
      scroller.removeEventListener('touchmove', onDragging as EventListener)
      scroller.removeEventListener('touchend', stopDragging)
    }
  }, [])

  return (
    <div className={styles.content}>
      {/* Recommend */}
      <div className={styles.recommendationSec}>
        <h1>Today's Recommendation</h1>
        <div className={styles.scroller} ref={scrollerRef}>
          <div className={styles.item}>
            <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" />
            <div>
              <label className={styles.pdName}>Eagle Yarn</label>
              <label className={styles.pdInfo}></label>
              <label className={styles.pdPrice}>20$</label>
            </div>
          </div>
          <div className={styles.item}>
            <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" />
          </div>
          <div className={styles.item}>
            <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" />
          </div>
          <div className={styles.item}>
            <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" />
          </div>
          <div className={styles.item}>
            <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" />
          </div>
        </div>
      </div>
      {/* Stocks */}
      <div className={styles.stockSec}>
        <h1>Stocks</h1>
        <div className={styles.itemlist}>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}><img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="rec1" /></div>
          <div className={styles.item}></div>
        </div>
      </div>
    </div>
  )
}

export default HomeView
