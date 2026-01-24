<script setup>
import { onMounted, nextTick } from 'vue';

onMounted(async () => {
    // Load Instagram embed script if not already loaded
    if (!window.instgrm) {
        const script = document.createElement('script');
        script.async = true;
        script.src = '//www.instagram.com/embed.js';
        script.onload = () => {
            // Process embeds after script loads
            if (window.instgrm) {
                window.instgrm.Embeds.process();
            }
        };
        document.body.appendChild(script);
    } else {
        // If already loaded, just process
        await nextTick();
        window.instgrm.Embeds.process();
    }
});
</script>

<template>
    <div class="ig-card">
        <blockquote class="instagram-media"
            data-instgrm-permalink="https://www.instagram.com/reel/DSo5skKkdr0/?utm_source=ig_embed&amp;utm_campaign=loading"
            data-instgrm-version="14"
            style="background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);">
            <!-- Keep all the blockquote content as is -->
            <div style="padding:16px;">
                <a href="https://www.instagram.com/reel/DSo5skKkdr0/?utm_source=ig_embed&amp;utm_campaign=loading"
                    style="background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;"
                    target="_blank">
                    <!-- ... rest of your content ... -->
                </a>
                <p
                    style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;">
                    <a href="https://www.instagram.com/reel/DSo5skKkdr0/?utm_source=ig_embed&amp;utm_campaign=loading"
                        style="color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;"
                        target="_blank">โพสต์ที่แชร์โดย Handmade Store &amp; Workshop (@kit_craft376)</a>
                </p>
            </div>
        </blockquote>
        <!-- Remove the script tag from template -->
    </div>
</template>

<style>
.ig-card {
    width: 100%;
    max-width: 400px;
    justify-self: end;
    border-radius: 20px;
    overflow: hidden;
}
</style>