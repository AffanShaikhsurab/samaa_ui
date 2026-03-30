import 'package:flutter/material.dart';

class ProfileContentTabs extends StatelessWidget {
  final String activeTab;
  final String postsLabel;
  final String alt1Label;
  final String alt2Label;
  final String alt3Label;
  final VoidCallback? onPostsTap;
  final VoidCallback? onAlt1Tap;
  final VoidCallback? onAlt2Tap;
  final VoidCallback? onAlt3Tap;

  const ProfileContentTabs({Key? key, required this.activeTab, this.postsLabel = 'Posts', this.alt1Label = 'Reels', this.alt2Label = 'Saved', this.alt3Label = 'Tagged', this.onPostsTap = null, this.onAlt1Tap = null, this.onAlt2Tap = null, this.onAlt3Tap = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              if (activeTab == "posts") InkWell(
                onTap: onPostsTap,
                child: Text(
                  postsLabel.toString(),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
              if (!(activeTab == "posts")) InkWell(
                onTap: onPostsTap,
                child: Text(
                  postsLabel.toString(),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
              if (activeTab == "posts") Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
              ),
              if (!(activeTab == "posts")) Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
              ),
            ],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              if (activeTab == "reels") InkWell(
                onTap: onAlt1Tap,
                child: Text(
                  alt1Label.toString(),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
              if (!(activeTab == "reels")) InkWell(
                onTap: onAlt1Tap,
                child: Text(
                  alt1Label.toString(),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
              if (activeTab == "reels") Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
              ),
              if (!(activeTab == "reels")) Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
              ),
            ],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              if (activeTab == "saved") InkWell(
                onTap: onAlt2Tap,
                child: Text(
                  alt2Label.toString(),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
              if (!(activeTab == "saved")) InkWell(
                onTap: onAlt2Tap,
                child: Text(
                  alt2Label.toString(),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
              if (activeTab == "saved") Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
              ),
              if (!(activeTab == "saved")) Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
              ),
            ],
          ),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              if (activeTab == "tagged") InkWell(
                onTap: onAlt3Tap,
                child: Text(
                  alt3Label.toString(),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
              if (!(activeTab == "tagged")) InkWell(
                onTap: onAlt3Tap,
                child: Text(
                  alt3Label.toString(),
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
              if (activeTab == "tagged") Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
              ),
              if (!(activeTab == "tagged")) Container(
                width: 22,
                height: 3,
                decoration: BoxDecoration(color: Color(0xFF334155), borderRadius: BorderRadius.circular(999)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
