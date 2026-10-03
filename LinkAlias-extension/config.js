/**
 * LinkAlias - Extension Configuration Module
 * 
 * Defines 5 supported platforms, default preferences, and domain mapping helper.
 */

(function (global) {
  'use strict';

  // Centralized Backend API base URL
  const API_BASE_URL = "http://127.0.0.1:8000";

  /**
   * The 5 Supported Platforms ONLY:
   * 1. WhatsApp
   * 2. Telegram
   * 3. Discord
   * 4. Facebook
   * 5. Instagram
   */
  const SUPPORTED_PLATFORMS = {
    whatsapp: {
      id: "whatsapp",
      name: "WhatsApp",
      domains: ["web.whatsapp.com", "whatsapp.com"]
    },
    telegram: {
      id: "telegram",
      name: "Telegram",
      domains: ["web.telegram.org", "telegram.org"]
    },
    discord: {
      id: "discord",
      name: "Discord",
      domains: ["discord.com", "ptb.discord.com", "canary.discord.com"]
    },
    facebook: {
      id: "facebook",
      name: "Facebook",
      domains: ["facebook.com", "www.facebook.com"]
    },
    instagram: {
      id: "instagram",
      name: "Instagram",
      domains: ["instagram.com", "www.instagram.com"]
    }
  };

  // Default enabled platforms
  const DEFAULT_ENABLED_PLATFORMS = ["whatsapp", "telegram", "discord"];

  const LinkAliasConfig = {
    apiBaseUrl: API_BASE_URL,
    supportedPlatforms: SUPPORTED_PLATFORMS,
    defaultEnabledPlatforms: DEFAULT_ENABLED_PLATFORMS,

    /**
     * Identify which supported platform key a hostname belongs to.
     * @param {string} hostname - Hostname from window.location.hostname
     * @returns {string|null} Platform key ('whatsapp', 'telegram', 'discord', 'facebook', 'instagram') or null
     */
    getPlatformForHostname: function (hostname) {
      if (!hostname) return null;
      const normalizedHost = hostname.toLowerCase().trim();

      for (const [key, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
        for (const domain of platform.domains) {
          const normDomain = domain.toLowerCase().trim();
          if (normalizedHost === normDomain || normalizedHost.endsWith('.' + normDomain)) {
            return key;
          }
        }
      }
      return null;
    },

    /**
     * Helper to check if current hostname belongs to any supported platform.
     */
    isSiteEnabled: function (hostname) {
      const platform = this.getPlatformForHostname(hostname);
      return Boolean(platform);
    }
  };

  global.LinkAliasConfig = LinkAliasConfig;

})(typeof window !== 'undefined' ? window : this);

