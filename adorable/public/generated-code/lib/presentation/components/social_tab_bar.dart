import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class SocialTabBar extends StatelessWidget {
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

  const SocialTabBar({Key? key, required this.activeTab, required this.homeLabel, required this.searchLabel, required this.createLabel, required this.reelsLabel, required this.profileLabel, this.onHome = null, this.onSearch = null, this.onCreate = null, this.onReels = null, this.onProfile = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[if (activeTab == "home") InkWell(
              onTap: onHome,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.home,
                      color: Color(0xFF111827),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Container(
                      width: 20,
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(999)),
                    ),
                  ],
                ),
              ),
            ), if (!(activeTab == "home")) InkWell(
              onTap: onHome,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.home,
                      color: Color(0xFF6B7280),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Text(
                      homeLabel.toString(),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            )],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[if (activeTab == "search") InkWell(
              onTap: onSearch,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.search,
                      color: Color(0xFF111827),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Container(
                      width: 20,
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(999)),
                    ),
                  ],
                ),
              ),
            ), if (!(activeTab == "search")) InkWell(
              onTap: onSearch,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.search,
                      color: Color(0xFF6B7280),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Text(
                      searchLabel.toString(),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            )],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[if (activeTab == "create") InkWell(
              onTap: onCreate,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.plusSquare,
                      color: Color(0xFF111827),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Container(
                      width: 20,
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(999)),
                    ),
                  ],
                ),
              ),
            ), if (!(activeTab == "create")) InkWell(
              onTap: onCreate,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.plusSquare,
                      color: Color(0xFF6B7280),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Text(
                      createLabel.toString(),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            )],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[if (activeTab == "reels") InkWell(
              onTap: onReels,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.clapperboard,
                      color: Color(0xFF111827),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Container(
                      width: 20,
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(999)),
                    ),
                  ],
                ),
              ),
            ), if (!(activeTab == "reels")) InkWell(
              onTap: onReels,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.clapperboard,
                      color: Color(0xFF6B7280),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Text(
                      reelsLabel.toString(),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            )],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[if (activeTab == "profile") InkWell(
              onTap: onProfile,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.userCircle,
                      color: Color(0xFF111827),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Container(
                      width: 20,
                      height: 3,
                      decoration: BoxDecoration(color: Color(0xFF111827), borderRadius: BorderRadius.circular(999)),
                    ),
                  ],
                ),
              ),
            ), if (!(activeTab == "profile")) InkWell(
              onTap: onProfile,
              child: Container(
                padding: EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Icon(
                      LucideIcons.userCircle,
                      color: Color(0xFF6B7280),
                      size: 22,
                    ),
                    SizedBox(height: 6),
                    Text(
                      profileLabel.toString(),
                      style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
              ),
            )],
          ),
        ),
      ],
    );
  }
}
