<template>
    <div class="content">
        <router-link :to="'/'">
            <div>Back to Home</div>
        </router-link>
        <div class="itemlist">
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$140<span class="ind-price">155</span></div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                    <p>bruhbruh</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
            <div class="card">
                <div>
                    <img src="https://th-test-11.slatic.net/p/124ca202fccb9636a6e8d32f40cf0c62.jpg" alt="yarn">
                </div>
                <div class="pd-def"><span class="pd-name">Yarn</span> this is the definition section</div>
                <div class="pd-price">$155</div>
                <div class="pd-tag">
                    <p>knitting</p>
                    <p>handicraft</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.content {
    padding: 0;
    min-width: 1000px;
    min-height: 100vh;
    background: radial-gradient(#e9e1d7,#fbfbfb);
}
.itemlist{
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    width: 75%;
    margin: 0 auto;
}
.itemlist .card{
    display: flex;
    flex-direction: column;
    height: 22vw;
    background: white;
    border: 1px solid #efe7da;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease; /* Smooth transition */
    &.card:hover{
      cursor: pointer;
      transform: translateY(-2px);
    }
}
.itemlist .card img{
    width: 15vw; /* Make image fill the item width */
    height: 15vw;
    object-fit: cover;
}
.pd-def{
    width: 85%;
    margin: 0 auto;
    font-size: 1em;
    &.pd-def .pd-name{
        font-weight: bold;
    } 
}
.pd-price{
    width: 70%;
    margin: 5px auto;
    font-size: 1em;
    color: rgb(215, 28, 28);
    text-align: center;
    &.pd-price .ind-price{
        margin: 0 3px 5px 3px;
        font-size: 0.7em;
        color: #e9e1d7;
        background-color: rgb(222, 68, 34);
        border-radius: 0.3em;
    }
}
.pd-tag{
    display: flex;
    width: 90%;
    justify-content: space-around;
    margin: 0 auto;
}
.pd-tag p{
    font-size: 0.8em;
    color: rgb(57, 208, 120);
    border: 1px solid rgb(57, 208, 120);
    border-radius: 0.1em;
    margin: 0;
}
</style>