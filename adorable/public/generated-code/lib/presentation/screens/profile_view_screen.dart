import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/media_grid.dart';
import '../components/privacy_state_badge.dart';
import '../components/profile_action_row.dart';
import '../components/profile_content_tabs.dart';
import '../components/profile_highlights_row.dart';
import '../components/profile_identity_header.dart';
import '../components/profile_metrics_bar.dart';
import '../components/profile_top_bar.dart';

class ProfileViewScreen extends StatelessWidget {
  const ProfileViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: <Widget>[
                Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: ProfileTopBar(
                      title: 'Profile',
                      primaryLabel: state.isOwnProfile ? "Edit profile" : "Create",
                      secondaryLabel: state.isOwnProfile ? "Share profile" : "Discover",
                      onPrimaryAction: () {
                        context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'create'));
                      },
                      onSecondaryAction: () {
                        context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                      },
                      onMenuTap: () {
                        context.read<InstaBlocBloc>().add(ToggleProfilePrivacyInstaBlocEvent());
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 0, 16),
                    child: ProfileIdentityHeader(
                      avatarText: state.profileAvatarText,
                      displayName: state.profileDisplayName,
                      username: state.profileUsername,
                      bio: state.profileBio,
                      linkLabel: state.profileLink,
                      subtitle: state.profileSubtitle,
                      isVerified: true,
                      isPrivate: state.isPrivateProfile,
                      onLinkTap: () {
                        context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 0, 16),
                    child: ProfileMetricsBar(
                      postCount: state.profilePosts,
                      followerCount: state.followers,
                      followingCount: state.following,
                      onPostsTap: () {
                        context.read<InstaBlocBloc>().add(SetProfileTabInstaBlocEvent(tab: 'posts'));
                      },
                      onFollowersTap: () {
                        context.read<InstaBlocBloc>().add(OpenFollowersInstaBlocEvent());
                      },
                      onFollowingTap: () {
                        context.read<InstaBlocBloc>().add(OpenFollowingInstaBlocEvent());
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 0, 16),
                    child: ProfileActionRow(
                      primaryLabel: state.isFollowingProfile ? "Following" : "Follow",
                      secondaryLabel: state.isOwnProfile ? "Share" : "Discover",
                      tertiaryLabel: state.isPrivateProfile ? "Make public" : "Make private",
                      onPrimary: () {
                        context.read<InstaBlocBloc>().add(ToggleProfileFollowInstaBlocEvent());
                      },
                      onSecondary: () {
                        context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                      },
                      onTertiary: () {
                        context.read<InstaBlocBloc>().add(ToggleProfilePrivacyInstaBlocEvent());
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 12, 16),
                    child: PrivacyStateBadge(
                      label: state.isPrivateProfile ? "Private profile" : "Public profile",
                      onTap: () {
                        context.read<InstaBlocBloc>().add(ToggleProfilePrivacyInstaBlocEvent());
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 0, 16),
                    child: ProfileHighlightsRow(
                      items: state.profileHighlights,
                      title: 'Highlights',
                      subtitle: 'Pinned story collections',
                      onItemTap: (dynamic value) {
                        context.read<InstaBlocBloc>().add(OpenStoryInstaBlocEvent(label: value));
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 0, 16),
                    child: ProfileContentTabs(
                      activeTab: state.profileTab,
                      postsLabel: 'Posts',
                      alt1Label: 'Reels',
                      alt2Label: 'Saved',
                      alt3Label: 'Tagged',
                      onPostsTap: () {
                        context.read<InstaBlocBloc>().add(SetProfileTabInstaBlocEvent(tab: 'posts'));
                      },
                      onAlt1Tap: () {
                        context.read<InstaBlocBloc>().add(SetProfileTabInstaBlocEvent(tab: 'reels'));
                      },
                      onAlt2Tap: () {
                        context.read<InstaBlocBloc>().add(SetProfileTabInstaBlocEvent(tab: 'saved'));
                      },
                      onAlt3Tap: () {
                        context.read<InstaBlocBloc>().add(SetProfileTabInstaBlocEvent(tab: 'tagged'));
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(16, 16, 0, 16),
                    child: MediaGrid(
                      items: state.profileMedia,
                      title: state.profileTab == "saved" ? "Saved" : "Recent posts",
                      subtitle: state.profileTab == "saved" ? "Private collection" : "Latest highlights",
                      onItemTap: (dynamic value) {
                        context.read<InstaBlocBloc>().add(OpenProfileMediaInstaBlocEvent(postId: value));
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
