import { computed, type Ref } from "vue";
import { mediaItemLimits, mediaServices, sortUpcomingItems } from "@/composables/media/constants";
import { sortRecentMedia } from "@/services/media/utils";
import type {
  HealthIssue,
  MediaConfig,
  MediaServiceType,
  RecentMediaItem,
  RequestItem,
  ServiceRuntime,
  UpcomingItem,
} from "@/types/media";

export const useMediaDerived = ({
  configsByService,
  runtimeMap,
  sonarrUpcoming,
  radarrUpcoming,
  sonarrHealth,
  radarrHealth,
  recentEntries,
  requests,
  lastRefreshAt,
}: {
  configsByService: Ref<Partial<Record<MediaServiceType, MediaConfig>>>;
  runtimeMap: Ref<Record<MediaServiceType, ServiceRuntime>>;
  sonarrUpcoming: Ref<UpcomingItem[]>;
  radarrUpcoming: Ref<UpcomingItem[]>;
  sonarrHealth: Ref<HealthIssue[]>;
  radarrHealth: Ref<HealthIssue[]>;
  recentEntries: Ref<RecentMediaItem[]>;
  requests: Ref<RequestItem[]>;
  lastRefreshAt: Ref<number | null>;
}) => {
  const combinedSchedule = computed(() => {
    return sortUpcomingItems([...sonarrUpcoming.value, ...radarrUpcoming.value]).slice(0, mediaItemLimits.calendar);
  });

  const arrHealth = computed(() => {
    return [...sonarrHealth.value, ...radarrHealth.value].slice(0, mediaItemLimits.health);
  });

  const recentMedia = computed(() => {
    return sortRecentMedia(recentEntries.value).slice(0, mediaItemLimits.recentMedia);
  });

  const requestFeed = computed(() => {
    return requests.value.slice(0, mediaItemLimits.requests);
  });

  const healthKicker = computed(() => {
    const enabled = mediaServices.filter((service) => configsByService.value[service.type]?.enabled);
    if (enabled.length === 0) return "No services enabled";
    const online = enabled.filter((service) => runtimeMap.value[service.type].state === "online").length;
    return `${online}/${enabled.length} services online`;
  });

  const lastRefreshLabel = computed(() => {
    if (!lastRefreshAt.value) return "No refresh yet";
    return `Updated ${new Date(lastRefreshAt.value).toLocaleTimeString()}`;
  });

  return {
    combinedSchedule,
    arrHealth,
    recentMedia,
    requestFeed,
    healthKicker,
    lastRefreshLabel,
  };
};
