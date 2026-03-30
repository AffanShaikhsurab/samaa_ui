import 'package:flutter/material.dart';

import 'social_tab_bar.dart';

class BottomTabShell extends StatelessWidget {
  final String activeTab;
  final String homeLabel;
  final String searchLabel;
  final String createLabel;
  final String reelsLabel;
  final String profileLabel;
  final VoidCallback? onHome;
  final VoidCallback? onSearch;
  final VoidCallback? onCreate;
  final VoidCallback? onReels;
  final VoidCallback? onProfile;

  const BottomTabShell({Key? key, required this.activeTab, this.homeLabel = 'Home', this.searchLabel = 'Search', this.createLabel = 'Create', this.reelsLabel = 'Reels', this.profileLabel = 'Profile', this.onHome = null, this.onSearch = null, this.onCreate = null, this.onReels = null, this.onProfile = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: EdgeInsets.fromLTRB(14, 20, 18, 20),
        decoration: BoxDecoration(color: Color(0xFFFFFFFF), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
        child: SocialTabBar(
          activeTab: activeTab,
          homeLabel: homeLabel,
          searchLabel: searchLabel,
          createLabel: createLabel,
          reelsLabel: reelsLabel,
          profileLabel: profileLabel,
          onHome: onHome,
          onSearch: onSearch,
          onCreate: onCreate,
          onReels: onReels,
          onProfile: onProfile,
        ),
      ),
    );
  }
}
